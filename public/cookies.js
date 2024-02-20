/**
 * Custom frontend browser cookies handler.
 * Adapted from [textiles journal](https://github.com/ogallagher/tejos_textiles).
 */

//config
const COOKIE_EXPIRATION = 24 * 60 * 60 * 1000
const COOKIE_MAX_BYTES = 4096 //max number of bytes in a cookie
const COOKIE_MAX_CHARS = COOKIE_MAX_BYTES / 2

//if cookie is too large, cookie_key --> [cookie_key[0], cookie_key[1], ...]
function cookies_set(key,val) {
    var date = new Date();
    date.setTime(date.getTime() + COOKIE_EXPIRATION);
	
	if (val.length > COOKIE_MAX_BYTES) {
		let i=0
		while (i < val.length) {
			document.cookie = key + '[' + i + ']=' + val.substring(i,COOKIE_MAX_CHARS) + '; expires=' + date.toUTCString() + '; path=/'
			i += COOKIE_MAX_CHARS
		}
	}
	else {
		document.cookie = key + '=' + val + '; expires=' + date.toUTCString() + '; path=/';
	}
}

function cookies_get(key) {
    let key_eq = key + '='
    let ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length)
        }
        if (c.indexOf(key_eq) == 0) {
            return c.substring(key_eq.length, c.length)
        }
    }
    //no cookie found
    return null
}

function cookies_delete(key) {
    document.cookie = key + '=; expires=-1; path=/';
}

function cookies_update(key,val) {
    if (val != null) {
        cookie_set(key,val);
		return val;
    }
    else {
        return cookie_get(key);
    }
}
