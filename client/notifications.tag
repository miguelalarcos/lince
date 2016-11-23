import {ws} from 'lince/client/webSocketActor.js'
import _ from 'lodash'
import {dispatcher} from 'lince/client/dispatcherActor.js'

<notifications>
    <div class="notification-bar">
        <div each={ notif in notifications }>
            <span class="{notif.type} {notif.animation}">{notif.msg}</span>
        </div>
    </div>
    <style scoped>
        .notification-bar{
            position: absolute;
        }
        .log{
            background-color: black;
            color: white
        }
        .success{
            background-color: darkseagreen;
            color: white
        }
        .error{
            background-color: indianred;
            color: white
        }
    </style>
    <script>
        this.mixin(this.opts.extends)
        this.subscribe()
        let ticket = 0
        this.notifications = []

        log(type, msg){
            let t = ticket++
            this.notifications.push({ticket: t, type, msg, animation: 'animated fadeIn'})
            this.update()
            setTimeout(()=>{
                let i = _.findIndex(this.notifications, (x)=> x.ticket == t)
                let aux = this.notifications[i] //slice
                aux.animation = 'animated fadeOut'
                this.notifications.splice(i,1,aux)
                this.update()
            }, 4000)
            setTimeout(()=>{
                this.notifications.splice(0, 1);
                this.update()}
                , 5000)
        }

        success(msg){
            this.log('success', msg)
        }

        error(msg){
            this.log('error', msg)
        }
    </script>

</notifications>

<notifications-debug>
    <notifications extends={debug} />

    <script>
        this.debug = {
            subscribe: function(){
                dispatcher.rv.observe((ch)=>{
                    let value = ch.newValue
                    this.log('log', value)
                })

                ws.connected.observe((ch)=>{
                    let value = ch
                    if(value){
                        this.success('connected')
                    }else{
                        this.error('disconnected')
                    }
                })
            }
        }
    </script>

</notifications-debug>