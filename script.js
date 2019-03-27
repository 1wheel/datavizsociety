var {_, fs, d3, jp, glob, io} = require('scrape-stl')


var membership = io.readDataSync(__dirname + '/challenge_data/dvs_challenge_1_membership_time_space.csv')

membership.forEach(d => d.key = [d.society, d.visualization, d.data]
  .map(d3.format('0f'))
  .join(' ')
)

jp.nestBy(membership, d => d.key)
  .forEach(keyGroup => keyGroup.forEach(d => d.numSame = keyGroup.length))

var byNumSame = jp.nestBy(membership, d => d.numSame)

// the data, visualization, society cols uniquely identify 633 people
// console.log(
//   _.sortBy(
//     byNumSame.map(d => {return {count: d.length, numSame: +d.key}}), 
//     d => +d.numSame)) 

var isPNG = {}
glob.sync(__dirname + '/badges/png/*').forEach(path => {
  var id = _.last(path.split('/')).replace('.png', '')
  isPNG[id] = true
})


// extract original responses from the badges
var badges = glob.sync(__dirname + '/badges/svg/*').sort()
  .map((path, i) => {
    var id = _.last(path.split('/')).replace('.svg', '')
    
    var str = fs.readFileSync(path, 'utf8')

    var x1 = null
    if (str.includes('line')){
      x1 = str.split('x1="')[1].split('"')[0]
    }

    var triangles = str.split('d="M')
      .slice(1)
      .map(d => d.split('Z')[0])

    return {id, x1, triangles}
  })
  .filter(d => isPNG[d.id])

console.log(glob.sync(__dirname + '/badges/svg/*').length)
console.log(glob.sync(__dirname + '/badges/png/*').length)
console.log(badges.length)

// io.writeDataSync(__dirname + '/challenge_data/badges.csv', badges)

// pull out the y cords from each triangle's path 
badges.forEach((d, i) => {
  d.i = i
  d.triangles = d.triangles.map(str => {
    var yVals = str.split('L').map(d => Math.round(d.split(',')[1]))

    return {str, yVals}
  })
})

// convert y cords to original survey value
var dim2Score = d3.range(3).map(i => {
  var yVals = _.sortBy(_.uniq(badges.map(d => d.triangles[0].yVals[i])))

  // dim 0: smaller y -> bigger tri
  // dim 1: smaller y -> smaller tri
  // dim 2: smaller y -> smaller tri
  if (!i) yVals.reverse()
  var rv = {}
  yVals.forEach((d, i) => rv[d] = i)

  return rv
})

// console.log(dim2Score)

badges.forEach(badge => {
  badge.triangles.forEach(tri => {
    tri.vals = tri.yVals.map((d, i) => dim2Score[i][d])
    tri.mean = d3.mean(tri.vals)
  })

  badge.key = badge.triangles
    .map(d => d.mean)
    .map(d3.format('0f'))
    .join(' ')
})


membership
  .filter(d => d.numSame == 1)
  .forEach(member => {
    var match = _.findWhere(badges, {key: member.key})

    member.match = match

    // if (match) console.log(member.key)
  })

// 594 matches found
// console.log('matches', d3.sum(membership, d => !!d.match))



// doesn't look like they're sorted the same way
// membership.forEach((d, i) => d.i = i)
// membership
//   .reverse()
//   .forEach((d, i) => {
//     if (!d.match) return

//     console.log(d.i, d.match.i)
//   })


// console.log(badges[0].triangles)


badgeVals = badges.map(d => {
  var rv = {id: d.id}
  delete rv.id

  d.triangles.forEach((tri, ti) => {
    var str = ['d', 'v', 's'][ti]
    tri.vals.forEach((d, i) => rv[str + i] = d )
  })

  return rv
})

// badgeVals = badgeVals.slice(0, 32)
io.writeDataSync('../load-projector-data/metadata.tsv', badgeVals)

// badgeVals.forEach((d, i) => d.id = i)
io.writeDataSync('../load-projector-data/tensors.tsv', badgeVals)




