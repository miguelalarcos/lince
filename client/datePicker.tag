<date-input>
    <table>
        <tr each={week in weeks()}>
            <td each={day in calendarWeek(week, currentDate)}>
                <span onclick={onSelectDate} class="{day.decoration}">{day.value}</span>
            </td>
        </tr>
    </table>

    <script>
        import moment from 'moment'
        import range from 'moment-range'
        import {LinkMixin} from 'lince/client/uiActor.js'

        this.mixin(LinkMixin(this))
        this.value = ''
        if(this.opts.link){
            this.link(this.opts.link, 'value', (d)=>moment(d).format(this.opts.format))
        }else{
            this.linkMap(this.opts.maplink, this.opts.name, 'value', (d)=>moment(d).format(this.opts.format))
        }

        currentDate = moment()
        weeks = () => [0, 1, 2, 3, 4, 5, 6]

        calendarWeek = (week, date) => {
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
                        decoration = 'calendar-day-in-month calendar-today'
                    }else{
                        decoration = 'calendar-day-in-month'
                    }
                }else{
                    decoration = 'calendar-day'
                }
                ret.push({value: m.format('DD'), date: m, decoration})
            })
            return ret
        }

        onSelectDate(evt){
            let date = evt.item.date.toDate()
            if(this.opts.link){
                this.opts.link.set(date)
            }else{
                this.opts.maplink.set(this.opts.name, date)
            }
        }
    </script>
</date-input>