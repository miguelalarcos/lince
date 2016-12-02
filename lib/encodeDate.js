import _ from 'lodash'
import moment from 'moment'
import {_encodeDates, _decodeDates} from './_encodeDate'

export const encodeDates = _encodeDates(_, moment)
export const decodeDates = _decodeDates(_, moment)
