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
    var article = document.querySelector('article');
    if ( resultsContainer ) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('results-container--searching');
    }
    article.className = '';
}

function toWord( match ) {
    match = match.map( function ( component ) {
        return component.trim();
    } );
    var word = { character: match[1], pinyin: [], definitions: [] };
    var defIndex = match.slice(2).findIndex( function ( word ) {
        return word.indexOf( '.' ) > -1;
    } );
    if ( defIndex === -1 ) {
        defIndex = match.length - 1;
    } else {
        defIndex += 2;
    }
    word.pinyin = match.slice( 2, defIndex );
    word.definitions = match.slice( defIndex );
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
        var article = document.querySelector('article');
        var val = this.value;
        if ( !val ) {
            resetSearch();
        } else {
            article.className = 'article--with-search-enabled';
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
                    var key = match[0];
                    var stroke = key.split('.')[0];
                    var item = document.createElement( 'li' );
                    var link = document.createElement( 'a' );
                    var word = toWord(match);
                    link.className = "link--stroke-" + stroke;
                    link.setAttribute( 'href', key.replace( '.', '-' ) + '.html');
                    link.textContent = key + ' ' + word.character + ' ' + word.pinyin.join( ' · ' );
                    word.definitions.forEach( function ( text ) {
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

var searchForm = document.querySelector('form');
if ( searchForm ) {
    setupSearch(searchForm);
}
