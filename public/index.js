/**
 * LINK COLORING
 */
// Add a class to links to denote how many strokes it has
Array.from(document.querySelectorAll('a')).forEach(function (node) {
    var re = /([0-9]+)\.[0-9]+/;
    var match = node.textContent.match(re);

    if (match) {
        node.className = 'link--stroke-' + match[1];
    } else {
        match = node.getAttribute('href').match(/([0-9]+)\-[0-9]+/);
        if ( match ) {
            node.className = 'link--stroke-' + match[1];
        }
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

function resetSearch() {
    var resultsContainer = document.querySelector('.results-container');
    if ( resultsContainer ) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('results-container--searching');
    }
    document.body.classList.remove( 'body--with-search-enabled' );
}

function toWord( match ) {
    match = match.map( function ( component ) {
        return component ? component.trim() : component;
    } );
    var keySplit = match[1].split( '#' );
    var word = { key: keySplit[0], anchor: keySplit[1],
        character: match[2], pinyin: [], definitions: [] };
    var defIndex = match.slice(3).findIndex( function ( word ) {
        return word.indexOf( '.' ) > -1;
    } );
    if ( defIndex === -1 ) {
        defIndex = match.length - 1;
    } else {
        defIndex += 3;
    }
    word.pinyin = match.slice( 3, defIndex );
    word.definitions = match.slice( defIndex );
    word.traditional = match[0];
    return word;
}

// Add search event listener
function setupSearch(form) {
    var resultsContainer = document.createElement( 'div' );
    resultsContainer.className = 'results-container';
    document.body.appendChild( resultsContainer );
    document.documentElement.addEventListener( 'click', function () {
        resetSearch();
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
            resetSearch();
        } else {
            document.body.classList.add( 'body--with-search-enabled' );
            autocomplete( val, function ( matches ) {
                resultsContainer.innerHTML = '';
                resultsContainer.classList.add('results-container--searching');
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
                    if ( !match ) {
                        return;
                    }
                    var item = document.createElement( 'li' );
                    var link = document.createElement( 'a' );
                    var word = toWord(match);
                    var key = word.key;
                    var stroke = key.split('.')[0];
                    link.className = "link--stroke-" + stroke;
                    link.setAttribute( 'href', key.replace( '.', '-' ) + '.html#' + word.anchor);
                    var textContent = key + ' ' + word.character;
                    if ( word.traditional ) {
                        textContent += ' (' + word.traditional + ')';
                    }
                    textContent += ' ' + word.pinyin.join( ' · ' );
                    link.textContent = textContent;
                    word.definitions.forEach( function ( text ) {
                        var def = document.createElement( 'span' );
                        def.innerText = text.replace(/[0-9]+\./, '').trim();
                        link.appendChild( def );
                    } );
                    item.appendChild( link );
                    link.addEventListener( 'click', resetSearch );
                    results.appendChild( item );
                } );
                resultsContainer.appendChild( results );
            } );
        }
    } );
}

function setupToc() {
    document.addEventListener( 'click', function ( ev ) {
        var target = ev.target;
        if ( target.matches( '.toc h2 > span' ) ) {
            target = target.parentNode;
        }
        if ( target.matches( '.toc h2 strong' ) ) {
            target = target.parentNode.parentNode;
        }
        if ( target.matches( '.toc h2' ) ) {
            var className =  target.className || '';
            target.className = className.indexOf( 'active' ) > -1 ? '' : 'active';
        }
    }, false );
}
setupToc();

function setupLiterals() {
    var em = document.querySelectorAll('em');
    Array.from( em ).forEach(function ( em ) {
        if ( em.textContent.indexOf( 'Literal.' ) > -1 ) {
            em.classList.add( 'em--literal');
        }

        if ( em.textContent.indexOf( 'Symbolic.' ) > -1 ) {
            em.classList.add( 'em--symbolic');
        }
    } );
}
function setupCompactTables() {
    var tables = document.querySelectorAll('table');
    Array.from( tables ).forEach(function ( table ) {
        if ( table.querySelectorAll( 'th' ).length === 2 ) {
            table.classList.add( 'table--compact' );
        }
    } );
}
var searchForm = document.querySelector('form');
if ( searchForm ) {
    setupSearch(searchForm);
}

// copy to server side html generation (someday)
setupLiterals();
setupCompactTables();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js', {
        updateViaCache: 'none' // this is new
    });
}
