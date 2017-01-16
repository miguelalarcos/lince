import {encodeDates, decodeDates} from '../lib/encodeDate'

if (typeof localStorage === "undefined" || localStorage === null) {
    //var LocalStorage = require('node-localstorage').LocalStorage
    //var localStorage = new LocalStorage('pending')
    var localStorage = {}
}

if(!localStorage.pending) {
    localStorage.pending = JSON.stringify({})
}

export const localStorageAddPending = (collection, doc) => {
    let pending = JSON.parse(localStorage.pending)
    let {path, obj} = encodeDates(doc)
    pending[doc.id] = {collection, doc: obj, dates: path}
    localStorage.pending = JSON.stringify(pending)
}

export const localStorageUpdatePending = (id, diff) => {
    let pending = JSON.parse(localStorage.pending)
    let p = pending[id]
    let q = decodeDates(p.doc, p.dates)
    q = Object.assign({}, q, diff)
    let {path, obj} = encodeDates(q)
    p.doc = obj
    p.dates = path
    localStorage.pending = JSON.stringify(pending)
}

export const localStorageDeletePending = (id) => {
    let pending = JSON.parse(localStorage.pending)
    delete pending[id]
    localStorage.pending = JSON.stringify(pending)
}

export const localStorageGetOnePending = () => {
    let pending = JSON.parse(localStorage.pending)
    let keys = Object.keys(pending)
    let key = keys[0]
    if(!key){
        return null
    }else{
        let p = pending[key]
        p = decodeDates(p.doc, p.dates)
        return p
    }
}

/*

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

export const localStorageShift = () => {
    let pending = JSON.parse(localStorage.pending)
    let ret = pending.shift()

    localStorage.pending = JSON.stringify(pending)
    return ret
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
*/
