const fs = require( 'fs' );
const { vocabIndex } = require( './../parse-vocab-text' );
function test( filename ) {
  console.log(`checking ${filename}`);
  const file = fs.readFileSync(filename, 'UTF-16LE'); // => <data>

  let lastLine, lastMatch = false;
  // l.replace(/ +$/, '').replace(/^ +/, '')
  file.toString().split('\r').map(l=>l).forEach((line) => {
      let m;
      if ( lastMatch ) {
          if ( lastLine[1] !== '	' && line[1] === '	' ) {
            line = '	' + line;
          }
          if ( lastLine[1] === '	' && line[1] !== '	' ) {
            lastLine = '	' + lastLine;
          }
          let tokens = lastLine.split(/[\t\n]/);
          let charTokens = line.split(/[\t\n]/);
          if (tokens[0] && !charTokens[0]) {
              charTokens = charTokens.slice(1);
          } else if ( !tokens[0] && tokens[1] && !charTokens[0] && !charTokens[1]) {
              //tokens = [ '' ].concat(tokens)
          }
          charTokens.forEach((c, i) => {
              c = c.trim();
              var ref = tokens[i];
              if ( c && ref && ref !== '' ) {
                  if ( !dict[ref] ) {
                      console.log('saving', ref, c );
                      dict[ref] = c;
                  } else {
                      if ( dict[ref] !== c ) {
                          console.log(tokens);
                          console.log(charTokens);
                          throw `${c} has wrong ref number. ${ref}... should be ${dict[ref]}?`;
                      }
                  }
              }
          })
          lastMatch = false;
      } else {
          const re = /([0-9]+\.[0-9]+)/g;
          while ( m = re.exec( line ) ) {
              lastMatch = true;
          }
      }
      lastLine = line;
      //console.log('------')
  } );
}
test('story1.txt');
test('story2.txt');
test('story3.txt');
test('story4.txt');
test('story5.txt');
Object.keys(dict).sort((a,b) => parseFloat(a) < parseFloat(b) ? -1 : 1).forEach((key) => {
  console.log( key, dict[key] );
});
