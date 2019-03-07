// Add a class to links to denote how many strokes it has
Array.from(document.querySelectorAll('a')).forEach(function (node) {
    var match = node.textContent.match(/([0-9]+)\.[0-9]+/);
    if (match) {
        node.className = 'link--stroke-' + match[1];
    }
});
