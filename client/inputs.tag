<integer-input>
    <input onkeyup={onChange} value={value} />
    <script>
        import {LinkMixin} from 'lince/client/uiActor.js'
        this.mixin(LinkMixin(this))
        this.value = ''
        if(this.opts.link){
            this.link(this.opts.link, 'value')
        }else{
            this.linkMap(this.opts.maplink, this.opts.name, 'value')
        }

        onChange(evt){
            let integer = /^[+-]?\d+$/.test(evt.target.value) ? parseInt(evt.target.value): evt.target.value
            if(this.opts.link){
                this.opts.link.set(integer)
            }else{
                this.opts.maplink.set(this.opts.name, integer)
            }
        }
    </script>
</integer-input>

<string-input>
    <input onkeyup={onChange} value={value} />
    <script>
        //import {LinkMixin} from 'lince/client/uiActor'
        this.mixin(LinkMixin(this))
        this.value = ''
        if(this.opts.link){
            this.link(this.opts.link, 'value')
        }else{
            this.linkMap(this.opts.maplink, this.opts.name, 'value')
        }

        onChange(evt){
            if(this.opts.link){
                this.opts.link.set(evt.target.value)
            }else{
                this.opts.maplink.set(this.opts.name, evt.target.value)
            }
        }
    </script>
</string-input>
