const r = require('rethinkdb')
const Q = require('q')
const Actor = require('../lib/Actor.js')
const encodeDates = require('../lib/encodeDateServer').encodeDates
const decodeDates = require('../lib/encodeDateServer').decodeDates
const _ = require('lodash')

/* offline
let loginLastTicket = {'miguel': -1}
let loginLastGeneratedId = {'miguel': -1}
*/

class Controller extends Actor{
    constructor(ws, conn){
        super()
        this.ws = ws
        this.conn = conn
        this.cursors = {}
        this.userId = null
        this.roles = null
        this.permissions = {}
        this.setUp()
    }

    setUp(){

    }

    async_notify(msg, done){
        msg = JSON.parse(msg)
        if(!_.isArray(msg.args) || !_.isArray(msg.dates) || !_.isString(msg.type) || !_.isInteger(msg.ticket)){
            done()
            return
        }
        msg.args = decodeDates(msg.args, msg.dates)
        /* offline
        if(msg.type == 'login'){
            this.userId = msg.args[0]
            if(msg.args[1] == 0){
                loginLastTicket[this.userId] = 0
            }
            done()
        }
        else if(msg.ticket > loginLastTicket[this.userId]){
        */
        if (msg.type == 'subscribe') {
            this.handle_subscribe(msg.args[0], msg.args.slice(1), msg.ticket, done)
        }else if (msg.type == 'unsubscribe') {
            this.handle_unsubscribe(msg.ticket, done)
        }else{
            this.handle_rpc(msg.type, msg.args, msg.ticket, done)
        }
        /* offline
        }else{
            let ret = {ticket: msg.ticket, type: 'rpc'}
            ret.dates = []
            ret.data = msg.type == 'add' ? loginLastGeneratedId[this.userId] : 1
            this.ws.send(JSON.stringify(ret))
            done()
        }
        */
    }
    handle_rpc(command, args, ticket, done){
        console.log('handle rpc', ticket)
        let ret = {ticket: ticket, type: 'rpc'}
        if(this['rpc_' + command]) {
            return Q(this['rpc_' + command](...args)).then((val) => {
                let {path, obj} = encodeDates(val)
                ret.dates = path
                ret.data = obj
                this.ws.send(JSON.stringify(ret))
                /* offline
                loginLastTicket[this.userId] = ticket
                */
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
        /* offline
        loginLastTicket[this.userId] = ticket
        */
        done()
    }

    handle_subscribe(predicate, args, ticket, done){
        console.log('subscribe', predicate, args, ticket)
        args = args || []
        let ret = {ticket: ticket, type: 'subscribe'}
        this['subs_' + predicate] && Q(this['subs_' + predicate](...args)).then((pred)=> {
            pred && pred.changes({includeInitial: true, includeStates: true}).run(this.conn, (err, cursor) => {
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
                                ret.predicate = predicate
                                console.log('feed')
                                let {path, obj} = encodeDates(data)
                                ret.dates = path
                                ret.data = obj
                                this.ws.send(JSON.stringify(ret))
                            }
                        }
                    }
                )
                /* offline
                loginLastTicket[this.userId] = ticket
                */
                done()
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
        delete doc.id
        delete doc.userId
        if(!this.check(collection, doc)){
            return Q(0)
        }
        let can = this.can('canAdd', collection, doc) //this.permissions[collection] && this.permissions[collection].canAdd(doc)
        //return this.can('add', collection, doc).then((can)=>{
        if(can) {
            doc = this.beforeAdd(collection, doc)
            return this.add(collection, doc).then((doc) => {
                /* offline
                loginLastGeneratedId[this.userId] = doc.generated_keys[0]
                */
                return doc.generated_keys[0]
            })
        }else{
            return Q(0)
        }
        //})
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

    _can(type, collection, doc){
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

    can(type, collection, doc){
        let p = this.permissions[collection]
        if(p){
            p = p[type]
            return p(doc)
        }
        else{
            return false
        }
    }

    permission(collection){
        let default_ = {
            canAdd: (doc) => false,
            canUpdate: (doc) => false,
            canDelete: (doc) => false
        }
        let p = this.permissions[collection]
        if(p){
            return p
        }
        else{
            this.permissions[collection] = default_
            return default_
        }
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
        delete doc.id
        delete doc.userId
        let oldDoc
        return this.get(collection, id).then((old)=>{
            oldDoc = old
            let can = this.can('canUpdate', collection, oldDoc) //this.permissions[collection] && this.permissions[collection].canUpdate(oldDoc)
            //return this.can('update', collection, oldDoc)
        //}).then((can)=>{
            if(can) {
                let newDoc = Object.assign({}, oldDoc, doc)
                if(!this.check(collection, newDoc)){
                    return 0
                }
                can = this.can('canAdd', collection, newDoc) //this.permissions[collection].canAdd(newDoc)
                //return this.can('add', collection, newDoc)
            }else{
                return 0
            }
        //}).then((can)=>{
            if(can){
                doc = this.beforeUpdate(collection, doc)
                return this.update(collection, id, doc).then((doc)=>{
                    return doc.replaced
                })
            }else{
                return 0
            }
        }).catch((err)=>{
            console.log(err)
            return 0
        })
    }

    delete(collection, id){
        return r.table(collection).get(id).delete().run(this.conn)
    }

    rpc_delete(collection, id){
        this.get(collection, id).then((oldDoc)=> {
            let can = this.can('canDelete', collection, oldDoc)// this.permissions[collection] && this.permissions[collection].canDelete(oldDoc)
            //    return this.can('delete', collection, oldDoc)
            //}).then((can)=>{
            if (can) {
                return this.delete(collection, id).then((doc) => {
                    return doc.deleted
                })
            } else {
                return 0
            }
            //})
        })
    }

    rpc_login(name){
        this.userId = name
        this.roles = ['A', 'B']
        return this.roles
    }

    get(collection, id){
        console.log('get', collection, id)
        return r.table(collection).get(id).run(this.conn)
    }

    close(){
        for(let c of Object.values(this.cursors)){
            c.close()
        }
        console.log('close')
    }
}

module.exports.Controller = Controller
