lince
-----
Reactive web apps like Meteor based on [riotjs](http://riotjs.com/), [mobx](https://github.com/mobxjs/mobx) and [rethinkdb](https://www.rethinkdb.com/).

Client side you write code like:

```html
import {dispatcher} from  'lince/client/dispatcherActor'
import 'lince/client/inputs.tag'

<my-static-todo-item-form>
    <div>
        <string-input mapLink={doc} name='desc' />
        <span class='alert'>{error_message_desc}</span>
        <button disabled={!enabled} onclick={onClick}>save</button>
    </div>
    <style scoped>
        .alert{
            font-style: italic;
            color: red;
        }
    </style>
    <script>
        import {FormMixin} from 'lince/client/form'
        import {validateItem} from '../validation/validateItem.js'

        this.mixin(FormMixin(this))
        this.initForm('todos', ['description'], validateItem)

        beforeAdd(doc){
            doc.done = false
            return doc
        }

        onClick(evt){
            this.save().then(()=>this.opts.rv.set(null))
        }
    </script>
</my-static-todo-item-form>

<todo-item>
    <div>
        <span class={"pointer " + (item.done ? 'done': '')} onclick={onClick}>{item.desc}</span>
        <button if={sameUser()} onclick={parent.onEdit}>edit</button>
    </div>
    <style scoped>
        .done{
            text-decoration:line-through;
        }
        .pointer{cursor: pointer;}
    </style>
    <script>
        onClick(evt){
            dispatcher.update('todos', this.item.id, {done: !this.item.done})
        }
        sameUser(){
            return item.userId == dispatcher.userId
        }
    </script>
</todo-item>

<app>
    <notifications-debug />
    <div>
        <button onclick={()=>this.filter.set('ALL')}>All</button>
        <button onclick={()=>this.filter.set('PENDING')}>Pending</button>
        <button onclick={()=>this.filter.set('DONE')}>Done</button>

        <div>{t(this.filter.get())}</div>
        <my-static-todo-item-form rv={rvEdit} predicateid={"unique id"} />
        <br>
        <todo-item each={ item, i in items }></todo-item>
        <br>
    </div>

    <script>
        import 'lince/client/notifications.tag'
        import {UImixin} from 'lince/client/uiActor.js'
        import {LinkMixin} from 'lince/client/uiActor'
        import {observable, autorun} from 'mobx'
        this.mixin(UImixin(this))
        this.mixin(LinkMixin(this))

        this.filter = observable('ALL')

        autorun(() =>{
            this.subscribe('unique id', 'todos', this.filter.get())
        })

        this.orderBy = [['description'], ['asc']] 

        this.val = observable('')
        this.rvEdit = observable(null)

        onEdit(evt){
            this.rvEdit.set(evt.item.item.id)
        }
    </script>
</app>
```

Server side you write code like:

```javascript
const Controller = require('lince/server/ServerController').Controller
const start = require('lince/server/ServerActor').start
const validateItem = require('../validation/validateItem').validateItem

class MyServer extends Controller{

    setUp(){
        this.permission('todos').canUpdate = (doc) => this.userId == doc.userId
        this.permission('todos').canAdd = (doc) => this.userId != null
    }

    subs_todos(filter){
        if(filter == 'ALL'){
            return r.table('todos')
        }
        else{
            return r.table('todos').filter({done: filter == 'DONE'})
        }
    }

    beforeUpdate(collection, doc){
        doc.updatedAt = new Date()
        return doc
    }

    beforeAdd(collection, doc){
        doc.userId = this.userId
        return doc
    }

    check(collection, doc){
        if(collection == 'todos'){
            return validateItem.validate(doc)
        }
        return super.check(collection, doc)
    }
}

start(MyServer)
```

And both sides:

```javascript
const validateItem = {
    desc: (val) => {
        if(/^\w+\s+\w+\s+\w+.*$/.test(val)){
            return ''
        }
        else{
            return 'At least three words.'
        }
    },
    validate: (doc) => {
        return validateItem.desc(doc.desc) == ''
    }
}

module.exports.validateItem = validateItem
```