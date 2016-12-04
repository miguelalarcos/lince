<date-input>
    <div onclick={toggleShow}>{value}</div>
        <div if={show}>
            <table>
                <tr each={week in weeks()}>
                    <td each={day in calendarWeek(week)}>
                        <span onclick={onSelectDate} class="{day.decoration}">{day.value}</span>
                    </td>
                </tr>
            </table>
        </div>
    </div>

    <script>
        import moment from 'moment'
        import range from 'moment-range'
        import {LinkMixin} from './uiActor.js'

        this.mixin(LinkMixin(this))
        this.value = ''
        if(!this.opts.name){
            this.link(this.opts.link, 'value', (d)=>moment(d).format(this.opts.format))
        }else{
            this.linkMap(this.opts.link, this.opts.name, 'value', (d)=>moment(d).format(this.opts.format))
        }

        this.show = false
        weeks(){
            return [0, 1, 2, 3, 4, 5, 6]
        }

        calendarWeek(week){
            let date
            if(!this.opts.name){
                date = moment(this.opts.link.get())
            }else{
                date = moment(this.opts.link.get(this.opts.name))
            }
            let ret = []
            let day = date.clone()
            let ini_month = day.clone().startOf('Month')
            let ini = day.clone().startOf('Month').add(1-ini_month.isoWeekday(), 'days')

            ini = ini.add(week, 'weeks')

            let dt = ini_month.clone().add(1, 'month')
            if(ini.isAfter(dt) || ini.isSame(dt)){
                return []
            }
            let end = ini.clone().add(6, 'days')

            let range = moment().range(ini, end)
            range.by('day', (m) => {
                let decoration
                if(ini_month.format('MM') == m.format('MM')){
                    if(m.isSame(moment().startOf('day'))){
                        decoration = 'calendar-day calendar-today'
                    }else{
                        decoration = 'calendar-day calendar-day-in-month'
                    }
                }else{
                    decoration = 'calendar-day calendar-day-not-in-month'
                }
                ret.push({value: m.format('DD'), date: m, decoration})
            })
            return ret
        }

        onSelectDate(evt){
            let date = evt.item.date.toDate()
            if(!this.opts.name){
                this.opts.link.set(date)
            }else{
                this.opts.link.set(this.opts.name, date)
            }
        }

        toggleShow(){
            this.show = !this.show
        }
    </script>

    <style scoped>
        .calendar-day {
            padding: 0.5em;
            border-radius: 4px;
        }
        .calendar-day:hover {
            background-color: #e8e9ed;
        }
        .calendar-day-not-in-month{
            color: lightgrey; /*#e8e9ed;*/
            font-style: italic;
        }
        .calendar-day-not-in-month:hover{
            color: #222;
        }
        .calendar-day-in-month{
            font-weight: bold;
        }
        .calendar-today{
            background: #F85555;
            color: #fff;
            text-decoration: none;
        }
    </style>
</date-input>
