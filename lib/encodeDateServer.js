const _  = require('lodash')
const moment = require('moment')
const enc = require('./_encodeDate')

module.exports.encodeDates = enc._encodeDates(_, moment)
module.exports.decodeDates = enc._decodeDates(_, moment)
