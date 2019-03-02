const { extractFromHeading, makeLists, markReferenceLinks,
    boldFirstLine,
    toMarkdown, reset, extractDefinitions } = require( './index' );
const assert = require( 'assert' );


describe(' extractFromHeading', function() {
    it( 'works without traditional', function () {
        const result = extractFromHeading( '口 kǒu ' );
        assert.strictEqual( result.char, '口', 'char extracted');
        assert.ok( result.traditional === undefined, 'traditional not extracted');
        assert.strictEqual( result.pinyin, 'kǒu', 'pinyin extracted')
    });
    it('works with traditional', function() {
        const result = extractFromHeading( '门 (門) mén' );
        assert.strictEqual( result.char, '门', 'char extracted');
        assert.strictEqual( result.traditional, '門', 'traditional extracted');
        assert.strictEqual( result.pinyin, 'mén', 'pinyin extracted')
    } );

    it('extracts notes', function() {
        const result = extractFromHeading( '了 le|liǎo – Not to be confused with 3.01 子' );
        assert.strictEqual( result.char, '了', 'char extracted');
        assert.strictEqual( result.note, 'Not to be confused with 3.01 子', 'note extracted');
        assert.strictEqual( result.pinyin, 'le|liǎo', 'pinyin extracted');
    } );
} );

describe(' extractDefinitions', function() {
    it('extracts multiple definition', function() {
        reset();
        const result = extractDefinitions( '1.	Big / Great – Antonym. 3.02 小' );
        assert.strictEqual( result.heading, '1.	Big / Great – Antonym. 3.02 小' );
    } );

    it('extracts single definitions', function() {
        reset();
        const result = extractDefinitions( 'Two (Numeral) / Second (Sequence) – reference: 1.01 一' );
        assert.strictEqual( result.heading, 'Two (Numeral) / Second (Sequence) – reference: 1.01 一' );
    } );
} );

describe( 'toMarkdown', function () {
    it('marks literals', function () {
        assert.strictEqual( toMarkdown('<Literal. Two old (folks)>；'),
            '*Literal. Two old (folks)*；');
    });
});

describe( 'makeLists', function () {
    it('marks lists', function () {
        assert.strictEqual(
            makeLists('\n两个人 people\n两片蛋糕 cake \n两碗面 noodles\n\n'),
            '\n- 两个人 people\n- 两片蛋糕 cake \n- 两碗面 noodles\n\n'
        );
        assert.strictEqual(
            makeLists('下午两点十二分 (xià wǔ liáng diǎn shí èr fēn) 2:12pm '),
            '- 下午两点十二分 (xià wǔ liáng diǎn shí èr fēn) 2:12pm '
        )
    });
    it('bolds lines ending with : character', function () {
        assert.strictEqual(
            makeLists('二 (èr) is used to tell date/time with the exception of “Two o’clock”:'),
            '\n**二 (èr) is used to tell date/time with the exception of “Two o’clock”:**'
        );
        assert.strictEqual(
            makeLists('Trim list with spaces: '),
            '\n**Trim list with spaces:**'
        );
    });
});

describe( 'boldFirstLine', () => {
    it('bolds first lines', function () {
        assert.strictEqual(
            boldFirstLine('二 is the trickiest numeral to grasp! Although'),
            '**二 is the trickiest numeral to grasp!** Although'
        );
        assert.strictEqual(
            boldFirstLine('Added before verbs to convey that the action has been made again\n'),
            '**Added before verbs to convey that the action has been made again** \n'
        );
        
    });
});

describe( 'markReferenceLinks', () => {
    it('marks links', function () {
        assert.strictEqual(
            markReferenceLinks('often with Classifiers, reference: 3.08 个'),
            'often with Classifiers, reference: [3.08 个](3-08.html)'
        );
    });
});

