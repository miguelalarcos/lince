import {localStorageGetPending} from '../lib/localStorageUtil'
import _ from 'lodash'

class Ticket{
    constructor(){
        let pending = localStorageGetPending()
        let last = _.last(pending)
        this.ticket = last && (last.ticket +1) || 0
    }

    getTicket(){
        return this.ticket++
    }

    setTicket(value){
        this.ticket = value
    }
}

export const T = new Ticket()