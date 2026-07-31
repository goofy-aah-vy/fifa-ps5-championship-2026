(function () {
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function bo3Winner(entry) {
    var wins = {};
    var order = [];
    entry.legs.forEach(function (leg) {
      if (leg.status !== 'finished') return;
      [leg.teamA, leg.teamB].forEach(function (t) {
        if (wins[t] === undefined) { wins[t] = 0; order.push(t); }
      });
      if (leg.scoreA === leg.scoreB) return;
      var legWinner = leg.scoreA > leg.scoreB ? leg.teamA : leg.teamB;
      wins[legWinner] += 1;
    });
    if (order.length !== 2) return null;
    var a = order[0], b = order[1];
    if (wins[a] >= 2) return a;
    if (wins[b] >= 2) return b;
    return null;
  }

  // Aggregate across both legs; away goals (scored as teamB) break a tie.
  function tieWinner(entry) {
    if (!entry) return null;
    if (entry.format === 'bo3') return bo3Winner(entry);

    if (!entry.legs || entry.legs.length < 2) return null;
    if (!entry.legs.every(function (l) { return l.status === 'finished'; })) return null;

    var totals = {};
    entry.legs.forEach(function (leg) {
      if (!totals[leg.teamA]) totals[leg.teamA] = { gf: 0, awayGf: 0 };
      if (!totals[leg.teamB]) totals[leg.teamB] = { gf: 0, awayGf: 0 };
      totals[leg.teamA].gf += leg.scoreA;
      totals[leg.teamB].gf += leg.scoreB;
      totals[leg.teamB].awayGf += leg.scoreB;
    });

    var names = Object.keys(totals);
    if (names.length !== 2) return null;
    var a = names[0], b = names[1];
    if (totals[a].gf !== totals[b].gf) return totals[a].gf > totals[b].gf ? a : b;
    if (totals[a].awayGf !== totals[b].awayGf) return totals[a].awayGf > totals[b].awayGf ? a : b;
    return null;
  }

  function buildIndex(bracket) {
    var index = {};
    bracket.quarterfinals.forEach(function (m) { index[m.id] = m; });
    bracket.semifinals.forEach(function (m) { index[m.id] = m; });
    index[bracket.final.id] = bracket.final;
    return index;
  }

  function participant(entry, side, index) {
    if (entry.legs && entry.legs.length) {
      return { name: side === 'A' ? entry.legs[0].teamA : entry.legs[0].teamB, known: true };
    }
    var fixedName = side === 'A' ? entry.teamA : entry.teamB;
    if (fixedName) return { name: fixedName, known: true };

    var sourceId = side === 'A' ? entry.sourceA : entry.sourceB;
    var source = index[sourceId];
    var winner = tieWinner(source);
    if (winner) return { name: winner, known: true };
    return { name: 'Winner of ' + (source ? source.label : '?'), known: false };
  }

  function qfNames(qf) {
    if (qf.legs && qf.legs.length) return [qf.legs[0].teamA, qf.legs[0].teamB];
    return [qf.teamA, qf.teamB];
  }

  function sideHtml(name, known, isWinner) {
    var cls = 'bt-side';
    if (isWinner) cls += ' bt-side--winner';
    else if (known) cls += ' bt-side--loser';
    else cls += ' bt-side--tbd';
    return '<div class="' + cls + '">' + (isWinner ? '<span class="bt-trophy">&#127942;</span> ' : '') + escapeHtml(name) + '</div>';
  }

  function matchBox(nameA, nameB, winner, knownA, knownB) {
    knownA = knownA === undefined ? true : knownA;
    knownB = knownB === undefined ? true : knownB;
    return (
      '<div class="bt-match">' +
        sideHtml(nameA, knownA, !!winner && winner === nameA) +
        sideHtml(nameB, knownB, !!winner && winner === nameB) +
      '</div>'
    );
  }

  function load() {
    fetch('data.json?t=' + Date.now()).then(function (r) { return r.json(); }).then(function (data) {
      document.getElementById('tournamentName').textContent = data.tournament.name;

      var container = document.getElementById('treeContainer');
      var bracket = data.bracket;
      if (!bracket) {
        container.innerHTML = '<div class="empty-state">Bracket not set yet</div>';
        return;
      }

      var index = buildIndex(bracket);
      var qfById = {};
      bracket.quarterfinals.forEach(function (m) { qfById[m.id] = m; });

      var qf1 = qfById.qf1, qf2 = qfById.qf2, qf3 = qfById.qf3, qf4 = qfById.qf4;
      var sf1 = index.sf1, sf2 = index.sf2, final = bracket.final;

      var qf1n = qfNames(qf1), qf3n = qfNames(qf3), qf2n = qfNames(qf2), qf4n = qfNames(qf4);
      var qf1w = tieWinner(qf1), qf3w = tieWinner(qf3), qf2w = tieWinner(qf2), qf4w = tieWinner(qf4);

      var sf1a = participant(sf1, 'A', index), sf1b = participant(sf1, 'B', index);
      var sf2a = participant(sf2, 'A', index), sf2b = participant(sf2, 'B', index);
      var sf1w = tieWinner(sf1), sf2w = tieWinner(sf2);

      var fa = participant(final, 'A', index), fb = participant(final, 'B', index);
      var champion = tieWinner(final);

      container.innerHTML =
        '<div class="bracket-tree-wrap">' +
          '<div class="bracket-tree">' +
            '<div class="bt-round bt-round--qf">' +
              '<div class="bt-round__label">Quarter-finals</div>' +
              '<div class="bt-pair">' +
                matchBox(qf1n[0], qf1n[1], qf1w) +
                matchBox(qf3n[0], qf3n[1], qf3w) +
              '</div>' +
              '<div class="bt-pair">' +
                matchBox(qf2n[0], qf2n[1], qf2w) +
                matchBox(qf4n[0], qf4n[1], qf4w) +
              '</div>' +
            '</div>' +
            '<div class="bt-round bt-round--sf">' +
              '<div class="bt-round__label">Semi-finals</div>' +
              '<div class="bt-slot">' + matchBox(sf1a.name, sf1b.name, sf1w, sf1a.known, sf1b.known) + '</div>' +
              '<div class="bt-slot">' + matchBox(sf2a.name, sf2b.name, sf2w, sf2a.known, sf2b.known) + '</div>' +
            '</div>' +
            '<div class="bt-round bt-round--final">' +
              '<div class="bt-round__label">Final</div>' +
              matchBox(fa.name, fb.name, champion, fa.known, fb.known) +
            '</div>' +
            '<div class="bt-round bt-round--champion">' +
              '<div class="bt-round__label">Champion</div>' +
              '<div class="bt-champion">' +
                (champion ? '<span class="bt-champion__trophy">&#127942;</span><span class="bt-champion__name">' + escapeHtml(champion) + '</span>' : '<span class="team-name--tbd">TBD</span>') +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    });
  }

  load();
  setInterval(load, 15000);
})();
