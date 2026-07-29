(function () {
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function getWinner(match) {
    if (!match || match.status !== 'finished') return null;
    if (match.scoreA > match.scoreB) return match.teamA;
    if (match.scoreB > match.scoreA) return match.teamB;
    return null;
  }

  function resolveSide(match, side, index) {
    var teamKey = side === 'A' ? 'teamA' : 'teamB';
    if (match[teamKey]) return { name: match[teamKey], known: true };

    var sourceKey = side === 'A' ? 'sourceA' : 'sourceB';
    var source = index[match[sourceKey]];
    var winner = getWinner(source);
    if (winner) return { name: winner, known: true };
    return { name: 'Winner of ' + (source ? source.label : '?'), known: false };
  }

  function renderSide(resolved, align) {
    if (!resolved.known) {
      return '<div class="team team--' + align + '"><div class="team-main"><span class="team-name team-name--tbd">' + escapeHtml(resolved.name) + '</span></div></div>';
    }
    var badge = '<span class="team-badge">' + initials(resolved.name) + '</span>';
    var nameHtml = '<span class="team-name">' + escapeHtml(resolved.name) + '</span>';
    var main = align === 'a' ? (nameHtml + badge) : (badge + nameHtml);
    return '<div class="team team--' + align + '"><div class="team-main">' + main + '</div></div>';
  }

  function renderBracketMatch(match, index) {
    var sideA = resolveSide(match, 'A', index);
    var sideB = resolveSide(match, 'B', index);

    var scoreHtml;
    if (match.status === 'finished') {
      scoreHtml = '<span class="score">' + match.scoreA + ' &ndash; ' + match.scoreB + '</span>';
    } else if (sideA.known && sideB.known) {
      scoreHtml = '<span class="score--vs">VS</span>';
    } else {
      scoreHtml = '<span class="score--vs">&mdash;</span>';
    }

    return (
      '<div class="bracket-match">' +
        renderSide(sideA, 'a') +
        scoreHtml +
        renderSide(sideB, 'b') +
      '</div>'
    );
  }

  function renderRound(title, matches, index) {
    return (
      '<div class="competition-block bracket-round">' +
        '<div class="competition-block__header">' + escapeHtml(title) + '</div>' +
        '<div class="bracket-round__matches">' +
          matches.map(function (m) { return renderBracketMatch(m, index); }).join('') +
        '</div>' +
      '</div>'
    );
  }

  function buildIndex(bracket) {
    var index = {};
    bracket.quarterfinals.forEach(function (m) { index[m.id] = m; });
    bracket.semifinals.forEach(function (m) { index[m.id] = m; });
    index[bracket.final.id] = bracket.final;
    return index;
  }

  function load() {
    fetch('/data.json?t=' + Date.now()).then(function (r) { return r.json(); }).then(function (data) {
      document.getElementById('tournamentName').textContent = data.tournament.name;

      var container = document.getElementById('bracketContainer');
      var bracket = data.bracket;

      if (!bracket) {
        container.innerHTML = '<div class="empty-state">Bracket not set yet</div>';
        return;
      }

      var index = buildIndex(bracket);

      container.innerHTML =
        '<div class="bracket-columns">' +
          renderRound('Quarter-finals', bracket.quarterfinals, index) +
          renderRound('Semi-finals', bracket.semifinals, index) +
          renderRound('Final', [bracket.final], index) +
        '</div>';
    });
  }

  load();
  setInterval(load, 15000);
})();
