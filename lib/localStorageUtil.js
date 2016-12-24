import {encodeDates, decodeDates} from '../lib/encodeDate'

if (typeof localStorage === "undefined" || localStorage === null) {
    //var LocalStorage = require('node-localstorage').LocalStorage
    //var localStorage = new LocalStorage('pending')
    var localStorage = {}
}

localStorage.pending = JSON.stringify([])

export const localStorageGetPending = () => {
    let ret = []
    let pending = JSON.parse(localStorage.pending)
    for(let p of pending){
        ret.push(decodeDates(p.obj, p.path))
    }
    return ret
}

export const localStoragePushPending = (doc) => {
    let {path, obj} = encodeDates(doc)
    let pending = JSON.parse(localStorage.pending)
    pending.push({path, obj})
    localStorage.pending = JSON.stringify(pending)
}

export const localStorageShiftAndReplacePending = (type, ticket, id) => {
    let pending = JSON.parse(localStorage.pending)
    let ret = pending.shift()
    if(type == 'add') {
        for (let p of pending) {
            if (p.type == 'update' || p.type == 'delete') {
                if (p.args[1] == ':' + ticket) {
                    p.args[1] = id
                }
            }
        }
    }
    localStorage.pending = JSON.stringify(pending)
    return ret
}

export const localStorageGetFirstPending = () => {
    let pending = localStorageGetPending()
    //let pending = JSON.parse(localStorage.pending)
    return pending[0]
}
