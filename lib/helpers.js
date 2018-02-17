return module.exports = {

    getYoutubeVideoId: function (url) {
        var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
        var match = url.match(regExp);
        return (match && match[7].length == 11) ? match[7] : false;
    },

    convertDuration: function (t) {
        var x = t.split('T'),
            duration = '',
            time = {},
            period = {},
            //just shortcuts
            s = 'string',
            v = 'variables',
            l = 'letters',
            // store the information about ISO8601 duration format and the divided strings
            d = {
                period: {
                    string: x[0].substring(1, x[0].length),
                    len: 4,
                    // years, months, weeks, days
                    letters: ['Y', 'M', 'W', 'D'],
                    variables: {}
                },
                time: {
                    string: x[1],
                    len: 3,
                    // hours, minutes, seconds
                    letters: ['H', 'M', 'S'],
                    variables: {}
                }
            };
        //in case the duration is a multiple of one day
        if (!d.time.string) {
            d.time.string = '';
        }

        for (var i in d) {
            var len = d[i].len;
            for (var j = 0; j < len; j++) {
                d[i][s] = d[i][s].split(d[i][l][j]);
                if (d[i][s].length > 1) {
                    d[i][v][d[i][l][j]] = parseInt(d[i][s][0], 10);
                    d[i][s] = d[i][s][1];
                } else {
                    d[i][v][d[i][l][j]] = 0;
                    d[i][s] = d[i][s][0];
                }
            }
        }
        period = d.period.variables;
        time = d.time.variables;
        time.H += 24 * period.D +
            24 * 7 * period.W +
            24 * 7 * 4 * period.M +
            24 * 7 * 4 * 12 * period.Y;

        if (time.H < 10) {
            time.H = '0' + time.H;
        }

        if (time.H) {
            if (time.M < 10) {
                time.M = '0' + time.M;
            }
        }

        if (time.S < 10) {
            time.S = '0' + time.S;
        }

        return time;
    },

    numberFormat: function (number, decimals, dec_point, thousands_sep) {
        number = (number + '').replace(/[^0-9+\-Ee.]/g, '');
        var n = !isFinite(+number) ? 0 : +number,
            prec = !isFinite(+decimals) ? 0 : Math.abs(decimals),
            sep = (typeof thousands_sep === 'undefined') ? ',' : thousands_sep,
            dec = (typeof dec_point === 'undefined') ? '.' : dec_point,
            s = '',
            toFixedFix = function (n, prec) {
                var k = Math.pow(10, prec);
                return '' + Math.round(n * k) / k;
            };
        // Fix for IE parseFloat(0.55).toFixed(0) = 0;
        s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
        if (s[0].length > 3) {
            s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, sep);
        }
        if ((s[1] || '').length < prec) {
            s[1] = s[1] || '';
            s[1] += new Array(prec - s[1].length + 1).join('0');
        }
        return s.join(dec);
    }

};