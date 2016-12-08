import Actor from '../lib/Actor.js'

let todos_filter = (filter) => {
    return (item) => {
        if(filter == 'ALL'){
            return true
        }else{
            return filter == 'DONE'? item.done: !item.done
        }
    }
}

class OfflineActor extends Actor{

    constructor(){
        super('Offline')
        this.ws = null
        this.ticketFilters = {}
        this.collections = {}
    }

    subscribe(ticket){
        this.ticketFilters[ticket] = todos_filter('ALL')
    }

    add(key, value){
        let oldDoc = this.collections[key] || null
        let newDoc = Object.assign({}, oldDoc, value)
        for(let t of Object.keys(this.ticketFilters)){
            let filter = this.ticketFilters[t]
            let type
            if(!oldDoc || !filter(oldDoc)){
                type = 'add'
            }else if(!filter(newDoc)){
                type = 'delete'
            }else{
                type = 'update'
            }
            this.ws.tell('dispatch', {ticket: t, type, data: {newVal: newDoc}, predicate: 'todos'})
        }
        this.collections[key] = newDoc
    }

    send(obj){
        console.log('*************************', obj)
        switch(obj.type){
            case 'subscribe':
                this.subscribe(obj.ticket)
                this.ws.tell('dispatch', {type: 'ready', ticket: obj.ticket})
                break
            case 'update':
                let id = obj.args[1]
                let doc = obj.args[2]
                doc.id = id
                this.add(id, doc)
                this.ws.tell('dispatch', {type: 'rpc', data: 1, ticket: obj.ticket})
                break
            case 'add':
                let ret = {type: obj.type, ticket: obj.ticket, data: obj.args[1]}
                ret.data.id = ':' + obj.ticket
                this.add(ret.data.id, ret.data)
                this.ws.tell('dispatch', {type: 'rpc', data: 1, ticket: ret.ticket})
                break
        }
    }
}

export const offline = new OfflineActor()