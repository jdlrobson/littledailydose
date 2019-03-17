/**
 * LINK COLORING
 */
// Add a class to links to denote how many strokes it has
Array.from(document.querySelectorAll('a')).forEach(function (node) {
    var match = node.textContent.match(/([0-9]+)\.[0-9]+/);
    if (match) {
        node.className = 'link--stroke-' + match[1];
    }
});

var search;
function getSearchJSON( callback ) {
    if (search) {
        callback(search);
    } else {
        /**
         * SEARCH FEATURE
         */
        var request = new XMLHttpRequest();
        request.onload = function ( ev ) {
            search = JSON.parse( ev.target.responseText );
            callback(search);
        };
        request.open( 'get', 'index.json' );
        request.send();
    }
}

/**
 * Fold accents in a string
 * @param {string} str
 * @return {string}
 */
function accentFold(str) {
    return str.replace(/[éēěè]/g, 'e' )
        .replace(/[àāǎá]/g, 'a' )
        .replace(/[ǒóōò]/g, 'o' )
        .replace(/[ūǚúùǔ]/g, 'u' )
        .replace(/[īìíǐ]/g, 'i' );
}
/**
 *
 * @param {string} str1
 * @param {string} str2
 * @return {boolean}
 */
function stringsMatch( str1, str2 ) {
    return str1 && str2 && accentFold( str1.toLowerCase() ).indexOf( accentFold( str2.toLowerCase() ) ) > -1;
}

/**
 *
 * @param {string} term to search for
 * @param {function} callback
 */
function autocomplete( term, callback ) {
    getSearchJSON( function ( s ) {
        callback( s.filter( function ( wordDescription ) {
            return wordDescription.filter( function ( component ) {
                return stringsMatch( component, term );
            } ).length > 0 ;
        } ) );
    } );
}

// Add search event listener
function setupSearch(form) {
    var resultsContainer = document.createElement( 'div' );
    resultsContainer.className = 'results-container';
    document.body.appendChild( resultsContainer );
    document.documentElement.addEventListener( 'click', function () {
        resultsContainer.innerHTML = '';
    } );
    resultsContainer.addEventListener( 'click', function ( ev ) {
        ev.stopPropagation();
    } );
    form.addEventListener( 'submit', function ( ev ) {
        ev.preventDefault();
        var nearestLink = resultsContainer.querySelectorAll( 'a' );
        if ( nearestLink && nearestLink[0] ) {
            window.location.href = nearestLink[0].getAttribute( 'href' );
        }
    } );
    document.querySelector('form input').addEventListener( 'input', function ( ev ) {
        var val = this.value;
        if ( !val ) {
            resultsContainer.innerHTML = '';
        } else {
            autocomplete( val, function ( matches ) {
                resultsContainer.innerHTML = '';
                var results = document.createElement( 'ul' );
                matches.sort( function ( m1, m2 ) {
                    if (
                        stringsMatch( val, m1[0] ) || stringsMatch( val, m1[1] ) ||
                        // e.g. qū|qǔ
                        stringsMatch( val, m1[2].split('|')[0] || '' ) ||
                        stringsMatch( val, m1[2].split('|')[1] || '' )
                    ) {
                        return -1;
                    } else if (
                        stringsMatch( val, m2[0] ) || stringsMatch( val, m2[1] ) ||
                        // e.g. qū|qǔ
                        stringsMatch( val, m2[2].split('|')[0] || '' ) ||
                        stringsMatch( val, m2[2].split('|')[1] || '' )
                    ) {
                        return 1;
                    } else {
                        // sort in order of number
                        return parseFloat( m1[0] ) < parseFloat( m2[0] ) ? -1 : 1;
                    }
                } ).forEach( function ( match ) {
                    var key = match[0];
                    var item = document.createElement( 'li' );
                    var link = document.createElement( 'a' );
                    link.setAttribute( 'href', key.replace( '.', '-' ) + '.html');
                    link.textContent = key + ' ' + match[1] + ' ' + match[2];
                    match.slice(3).forEach( function ( text ) {
                        var def = document.createElement( 'span' );
                        def.innerText = text;
                        link.appendChild( def );
                    } );
                    item.appendChild( link );
                    results.appendChild( item );
                } );
                resultsContainer.appendChild( results );
            } );
        }
    } );
}

var searchForm = document.querySelector('form');
if ( searchForm ) {
    setupSearch(searchForm);
}
