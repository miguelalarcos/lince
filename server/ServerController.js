const r = require('rethinkdb')
const Q = require('q')
const Actor = require('../lib/Actor.js')
const encodeDates = require('../lib/encodeDateServer').encodeDates
const decodeDates = require('../lib/encodeDateServer').decodeDates
const _ = require('lodash')

let loginLastTicket = {'miguel': -1}
let loginLastGeneratedId = {'miguel': -1}

class Controller extends Actor{
    constructor(ws, conn){
        super()
        this.ws = ws
        this.conn = conn
        this.cursors = {}
        this.userId = 'miguel'
        this.roles = ['A', 'B']
    }
    async_notify(msg, done){
        msg = JSON.parse(msg)
        if(!_.isArray(msg.args) || !_.isArray(msg.dates) || !_.isString(msg.type) || !_.isInteger(msg.ticket)){
            done()
            return
        }
        msg.args = decodeDates(msg.args, msg.dates)
        if(msg.type == 'login'){
            this.userId = msg.args[0]
            if(msg.args[1] == 0){
                loginLastTicket[this.userId] = 0
            }
            done()
        }
        else if(msg.ticket > loginLastTicket[this.userId]){
            if (msg.type == 'subscribe') {
                this.handle_subscribe(msg.args[0], msg.args.slice(1), msg.ticket, done)
            }else if (msg.type == 'unsubscribe') {
                this.handle_unsubscribe(msg.ticket, done)
            }else{
                this.handle_rpc(msg.type, msg.args, msg.ticket, done)
            }
        }else{
            let ret = {ticket: msg.ticket, type: 'rpc'}
            ret.dates = []
            ret.data = msg.type == 'add' ? loginLastGeneratedId[this.userId] : 1
            this.ws.send(JSON.stringify(ret))
            done()
        }
    }
    handle_rpc(command, args, ticket, done){
        console.log('handle rpc', ticket)
        let ret = {ticket: ticket, type: 'rpc'}
        if(this['rpc_' + command]) {
            console.log('dentro')
            return Q(this['rpc_' + command](...args)).then((val) => {
                console.log('val', val)
                let {path, obj} = encodeDates(val)
                ret.dates = path
                ret.data = obj
                console.log('send rpc reponse', ret)
                this.ws.send(JSON.stringify(ret))
                loginLastTicket[this.userId] = ticket
                done()
            }).catch((err)=>{
                done()
            })
        }else{
            done()
        }
    }

    handle_unsubscribe(ticket, done){
        console.log('unsubscribe', ticket)
        if(this.cursors[ticket]) {
            this.cursors[ticket].close()
            delete this.cursors[ticket]
        }
        loginLastTicket[this.userId] = ticket
        //Controller.lastTicket = ticket
        console.log('done')
        done()
    }

    handle_subscribe(predicate, args, ticket, done){
        console.log('subscribe', predicate, args, ticket)
        args = args || []
        let ret = {ticket: ticket, type: 'subscribe'}
        //let pred = this['subs_' + predicate](...args)
        this['subs_' + predicate] && Q(this['subs_' + predicate](...args)).then((pred)=> {
            console.log('pred:', pred)
            pred && pred.changes({includeInitial: true, includeStates: true}).run(this.conn, (err, cursor) => {
                console.log('dentro de pred')
                this.cursors[ticket] = cursor
                cursor.each((err, data) => {
                        if (err) {
                            console.log('error at streaming', err, '---')
                        } else {
                            if (data.state) {
                                data = {type: data.state, ticket: ticket, dates: []}
                                console.log('feed', data)
                                this.ws.send(JSON.stringify(data))
                            } else {
                                let type
                                if (!data.old_val) {
                                    type = 'add'
                                    data.newVal = data.new_val
                                    delete data.old_val
                                    delete data.new_val
                                } else if (!data.new_val) {
                                    type = 'delete'
                                    data.id = data.old_val.id
                                    delete data.old_val
                                    delete data.new_val
                                } else {
                                    type = 'update'
                                    data.newVal = data.new_val
                                    delete data.old_val
                                    delete data.new_val
                                }
                                ret.type = type
                                //ret.data = data
                                ret.predicate = predicate
                                console.log('feed')
                                //ret.dates = encodeDates(data)
                                let {path, obj} = encodeDates(data)
                                ret.dates = path
                                ret.data = obj
                                this.ws.send(JSON.stringify(ret))
                            }
                        }
                    }
                )
                loginLastTicket[this.userId] = ticket
                //Controller.lastTicket = ticket
                console.log('done')
                done()
                // cursor.on('data', (change) => {ret.data=change; this.ws.send(JSON.stringify(ret))})
            })
        })
    }

    check(collection, doc){
        return true
    }

    add(collection, doc){
        return r.table(collection).insert(doc).run(this.conn)
    }

    rpc_add(collection, doc){
        return this.check(collection, doc) && this.can('add', collection, doc).then((can)=>{
            if(can) {
                doc = this.beforeAdd(collection, doc)
                return this.add(collection, doc).then((doc) => {
                    loginLastGeneratedId[this.userId] = doc.generated_keys[0]
                    return doc.generated_keys[0]
                })
            }else{
                return 0
            }
        })
    }

    hasRole(role){
        return _.includes(this.roles, role)
    }

    match(doc, pattern){
        if(_.isEmpty(pattern)){
            return true
        }
        let flag = false
        for(let key of Object.keys(pattern)){
            if(doc[key] != (pattern[key] || this.userId)){
                flag = false
                break
            }else{
                flag = true
            }
        }
        return flag
    }

    getRules(type, collection){
        return r.table('rules').filter({type, collection}).toArray()
    }

    can(type, collection, doc){
        let can = false
        return this.getRules(type, collection).then((results)=>{
            for(let r of results){
                if(this.match(doc, r.pattern) && !this.hasRole(r.role)){
                    can = false
                    break
                }
                else{
                    can = true
                }
            }
            return can
        })
    }

    beforeAdd(collection, doc){
        return doc
    }

    beforeUpdate(collection, doc){
        return doc
    }

    update(collection, id, doc){
        return r.table(collection).get(id).update(doc).run(this.conn)
    }

    rpc_update(collection, id, doc){
        let oldDoc
        return this.get(collection, id).then((old)=>{
            oldDoc = old
            return this.can('update', collection, oldDoc)
        }).then((can)=>{
            if(can) {
                let newDoc = Object.assign({}, oldDoc, doc)
                return this.check(collection, newDoc) && this.can('insert', collection, newDoc)
            }else{
                return false
            }
        }).then((can)=>{
            if(can){
                doc = this.beforeUpdate(collection, doc)
                this.update(collection, id, doc).then((doc)=>{
                    return doc.replaced
                })
            }else{
                return 0
            }
        })
    }

    delete(collection, id){
        return r.table(collection).get(id).delete().run(this.conn)
    }

    rpc_delete(collection, id){
        this.get(collection, id).then((oldDoc)=>{
            return this.can('delete', collection, oldDoc)
        }).then((can)=>{
            if(can){
                this.delete(collection, id).then((doc)=>{
                    return doc.deleted
                })
            }else{
                return 0
            }
        })
    }

    get(collection, id){
        console.log('get', collection, id)
        return r.table(collection).get(id).run(this.conn)
        /*if(callback) {
            r.table(collection).get(id).run(this.conn).then((doc) => callback(doc))
        }
        else {
            return r.table(collection).get(id).run(this.conn) // return ?
        }
        */
    }

    close(){
        for(let c of Object.values(this.cursors)){
            c.close()
        }
        console.log('close')}
}

module.exports.Controller = Controller