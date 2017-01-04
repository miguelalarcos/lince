import {observable, asMap, asReference} from 'mobx'
import {T} from './Ticket.js'
import _ from 'lodash'
import Actor from '../lib/Actor.js'

class collectionStoreActor extends Actor{
    constructor() {
        super()
        this.ws = null
        this.collections = {}
        this.metadata = observable(asMap())
        this.predicates = {}
        this.filters = {}
        this.ticketsCollection = {}
        this.promises = {}
        this.subsId = {}
        this.registered = {}
        this.activeTickets = new Set()
    }

    getTicketForPredicate(predicate, args={}){
        let pred = this.predicates[predicate]
        if(pred){
            for(let p of pred){
                if(_.isEqual(args, p.args)){
                    return p.ticket
                }else{
                    let t = T.getTicket()
                    this.predicates[name].push({ticket: t, args: args})
                    return t
                }
            }
        }
        else{
            let t = T.getTicket()
            this.predicates[predicate] = [{ticket: t, args: args}]
            return t
        }
    }

    subscribe(promise, id, predicate, ...args){
        console.log('subscribe', id, predicate)
        let ticket = T.getTicket(predicate, args)
        //this.filters[ticket] = filter(...args) // creo que se puede qiutar
        this.ticketsCollection[ticket] = this.registered[predicate] // se puede quitar?
        if (!this.collections[ticket]) {
            this.collections[ticket] = observable(asMap([], asReference))
        }
        this.activeTickets.add(ticket)
        //let name = this.registered[predicate]
        let collection = this.collections[ticket]
        promise.resolve({ticket, collection})
        if (this.subsId[id]) {
            delete this.collections[this.subsId[id]]
            this.ws.tell('send', 'unsubscribe', [], this.subsId[id])
            this.activeTickets.delete(this.subsId[id])
        }
        this.subsId[id] = ticket
        args.unshift(predicate)
        this.ws.tell('send', 'subscribe', args, ticket)
    }

    register(predicate, collection){
        this.registered[predicate] = collection
    }

    getCollection(predicate){
        return this.registered[predicate] || predicate
    }

    clear(collection){
        this.collections[collection].clear()
    }

    clearTicket(){
        ticket = 1
    }

    notify(msg){
        let collection = this.registered[msg.predicate]
        if(!_.includes([...this.activeTickets], msg.ticket)){
            return
        }
        switch(msg.type){
            case 'initializing':
                this.metadata.set(''+msg.ticket, 'initializing')
                break
            case 'ready':
                this.metadata.set(''+msg.ticket, 'ready')
                break
            case 'add':
                this.add(msg.data, msg.ticket)
                break
            case 'update':
                this.update(msg.data, msg.ticket)
                break
            case 'delete':
                this.delete(msg.data.id, msg.ticket)
                break
        }
    }

    add(doc, t){
        doc = doc.newVal
        //let aux = this.collections[t].get(':'+t) || this.collections[t].get(doc.id)
        this.collections[t].set(doc.id, doc)
        //this.collections[t].delete(':'+t)
    }

    update(doc, t){
        doc = doc.newVal
        this.collections[t].set(doc.id, doc)
    }

    delete(id, t){
        let doc = this.collections[t].get(id)
        this.collections[t].delete(id)
    }
}

export const store = new collectionStoreActor()
