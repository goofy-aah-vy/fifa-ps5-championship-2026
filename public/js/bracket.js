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

  // Aggregate across both legs; away goals (scored as teamB) break a tie,
  // matching the away-goals tiebreaker used in the group stage.
  function tieWinner(entry) {
    if (!entry || !entry.legs || entry.legs.length < 2) return null;
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

  function aggregateSummary(entry) {
    if (!entry.legs || entry.legs.length < 2) return null;
    var totals = {};
    var order = [];
    entry.legs.forEach(function (leg) {
      [leg.teamA, leg.teamB].forEach(function (t) {
        if (totals[t] === undefined) { totals[t] = 0; order.push(t); }
      });
      totals[leg.teamA] += leg.scoreA;
      totals[leg.teamB] += leg.scoreB;
    });
    if (order.length !== 2) return null;
    return { a: order[0], b: order[1], scoreA: totals[order[0]], scoreB: totals[order[1]] };
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

  function renderClub(club) {
    return club ? '<span class="team-club">' + escapeHtml(club) + '</span>' : '';
  }

  function renderSide(resolved, club, align) {
    if (!resolved.known) {
      return '<div class="team team--' + align + '"><div class="team-main"><span class="team-name team-name--tbd">' + escapeHtml(resolved.name) + '</span></div></div>';
    }
    var badge = '<span class="team-badge">' + initials(resolved.name) + '</span>';
    var nameHtml = '<span class="team-name">' + escapeHtml(resolved.name) + '</span>';
    var main = align === 'a' ? (nameHtml + badge) : (badge + nameHtml);
    return '<div class="team team--' + align + '"><div class="team-main">' + main + '</div>' + renderClub(club) + '</div>';
  }

  function renderLeg(leg, legNum) {
    var scoreHtml = leg.status === 'finished'
      ? '<span class="score">' + leg.scoreA + ' &ndash; ' + leg.scoreB + '</span>'
      : '<span class="score--vs">VS</span>';

    return (
      '<div class="leg-row">' +
        '<span class="leg-tag">L' + legNum + '</span>' +
        '<span class="status-chip status-chip--' + (leg.status === 'finished' ? 'finished' : 'scheduled') + '">' + (leg.status === 'finished' ? 'FT' : 'TBD') + '</span>' +
        renderSide({ name: leg.teamA, known: true }, leg.clubA, 'a') +
        scoreHtml +
        renderSide({ name: leg.teamB, known: true }, leg.clubB, 'b') +
      '</div>'
    );
  }

  function renderPlaceholder(entry, index) {
    var sideA = participant(entry, 'A', index);
    var sideB = participant(entry, 'B', index);
    var scoreHtml = '<span class="score--vs">&mdash;</span>';

    return (
      '<div class="leg-row">' +
        '<span class="leg-tag">&nbsp;</span>' +
        '<span class="status-chip status-chip--scheduled">TBD</span>' +
        renderSide(sideA, null, 'a') +
        scoreHtml +
        renderSide(sideB, null, 'b') +
      '</div>'
    );
  }

  function renderTie(entry, index) {
    if (!entry.legs || !entry.legs.length) {
      return '<div class="tie-card">' + renderPlaceholder(entry, index) + '</div>';
    }

    var legsHtml = entry.legs.map(function (leg, i) { return renderLeg(leg, i + 1); }).join('');
    var agg = aggregateSummary(entry);
    var winner = tieWinner(entry);
    var noteHtml = '';
    if (agg) {
      var aggText = 'Aggregate: ' + escapeHtml(agg.a) + ' ' + agg.scoreA + ' &ndash; ' + agg.scoreB + ' ' + escapeHtml(agg.b);
      if (winner) aggText += ' &middot; <strong>' + escapeHtml(winner) + '</strong> advance';
      noteHtml = '<div class="leg-note">' + aggText + '</div>';
    }

    return '<div class="tie-card">' + legsHtml + noteHtml + '</div>';
  }

  function renderRound(title, entries, index) {
    return (
      '<div class="competition-block bracket-round">' +
        '<div class="competition-block__header">' + escapeHtml(title) + '</div>' +
        '<div class="fixtures">' +
          entries.map(function (e) { return renderTie(e, index); }).join('') +
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
