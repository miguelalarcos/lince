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

export const localStorageShiftPending = () => {
    let pending = JSON.parse(localStorage.pending)
    pending.shift()
    localStorage.pending = JSON.stringify(pending)
}