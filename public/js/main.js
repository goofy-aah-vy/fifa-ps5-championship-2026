(function () {
  function initials(name) {
    var parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function statusChip(m) {
    if (m.status === 'live') {
      return '<span class="status-chip status-chip--live"><span class="live-dot"></span>LIVE</span>';
    }
    if (m.status === 'finished') {
      return '<span class="status-chip status-chip--finished">FT</span>';
    }
    if (m.status === 'postponed') {
      return '<span class="status-chip status-chip--postponed">POSTPONED</span>';
    }
    return '<span class="status-chip status-chip--scheduled">' + fmtClock(m.kickoff) + '</span>';
  }

  function fmtClock(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return 'TBC';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function renderClub(club) {
    return club ? '<span class="team-club">' + escapeHtml(club) + '</span>' : '';
  }

  function renderLeg(m, legNum) {
    var forgotten = !!m.scoreForgotten;
    var scoreHtml = (m.status === 'scheduled' || m.status === 'postponed')
      ? '<span class="score--vs">VS</span>'
      : forgotten
        ? '<span class="score--vs score--forgotten">?</span>'
        : '<span class="score">' + m.scoreA + ' &ndash; ' + m.scoreB + '</span>';

    var noteHtml = '';
    if (forgotten) {
      var winnerName = m.scoreA > m.scoreB ? m.teamA : (m.scoreB > m.scoreA ? m.teamB : null);
      noteHtml = '<div class="leg-note leg-note--forgotten">' +
        (winnerName ? '<strong>' + escapeHtml(winnerName) + '</strong> won' : 'Result unclear') +
        ' &mdash; I forgor the scores T_T</div>';
    } else if (m.note) {
      noteHtml = '<div class="leg-note">&#9888; ' + escapeHtml(m.note) + '</div>';
    }

    return (
      '<div class="leg-row">' +
        '<span class="leg-tag">L' + legNum + '</span>' +
        statusChip(m) +
        '<div class="team team--a">' +
          '<div class="team-main"><span class="team-name">' + escapeHtml(m.teamA) + '</span><span class="team-badge">' + initials(m.teamA) + '</span></div>' +
          renderClub(m.clubA) +
        '</div>' +
        scoreHtml +
        '<div class="team team--b">' +
          '<div class="team-main"><span class="team-badge">' + initials(m.teamB) + '</span><span class="team-name">' + escapeHtml(m.teamB) + '</span></div>' +
          renderClub(m.clubB) +
        '</div>' +
      '</div>' +
      noteHtml
    );
  }

  function tieKey(m) {
    return [m.teamA, m.teamB].slice().sort().join(' :: ');
  }

  function groupIntoTies(matches) {
    var order = [];
    var byPair = {};
    matches.forEach(function (m) {
      var key = tieKey(m);
      if (!byPair[key]) { byPair[key] = []; order.push(key); }
      byPair[key].push(m);
    });
    return order.map(function (key) { return byPair[key]; });
  }

  function renderTie(legs) {
    var leg1 = legs[0];
    var leg2 = legs[1] || {
      teamA: leg1.teamB,
      teamB: leg1.teamA,
      scoreA: 0,
      scoreB: 0,
      status: leg1.status === 'postponed' ? 'postponed' : 'scheduled',
      kickoff: leg1.kickoff
    };

    return (
      '<div class="tie-card">' +
        renderLeg(leg1, 1) +
        renderLeg(leg2, 2) +
      '</div>'
    );
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function groupBy(matches) {
    var order = [];
    var byGroup = {};
    matches.forEach(function (m) {
      var key = m.group || 'Fixtures';
      if (!byGroup[key]) { byGroup[key] = []; order.push(key); }
      byGroup[key].push(m);
    });
    return order.map(function (key) { return { group: key, matches: byGroup[key] }; });
  }

  function computeStandings(matches) {
    var teams = [];
    matches.forEach(function (m) {
      if (teams.indexOf(m.teamA) === -1) teams.push(m.teamA);
      if (teams.indexOf(m.teamB) === -1) teams.push(m.teamB);
    });

    // Convention: teamA is the home side, teamB is the away side for that leg.
    // Each pair of teams plays twice (home & away), so away goals scored
    // double as the tiebreaker when points and goal difference are level.
    var table = {};
    teams.forEach(function (t) {
      table[t] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, awayGf: 0, pts: 0, form: [] };
    });

    matches.filter(function (m) { return m.status === 'finished'; })
      .sort(function (x, y) { return new Date(x.kickoff) - new Date(y.kickoff); })
      .forEach(function (m) {
        var a = table[m.teamA];
        var b = table[m.teamB];
        a.p++; b.p++;
        a.gf += m.scoreA; a.ga += m.scoreB;
        b.gf += m.scoreB; b.ga += m.scoreA;
        b.awayGf += m.scoreB;
        if (m.scoreA > m.scoreB) { a.w++; a.pts += 3; b.l++; a.form.push('W'); b.form.push('L'); }
        else if (m.scoreA < m.scoreB) { b.w++; b.pts += 3; a.l++; a.form.push('L'); b.form.push('W'); }
        else { a.d++; b.d++; a.pts++; b.pts++; a.form.push('D'); b.form.push('D'); }
      });

    return Object.keys(table).map(function (k) { return table[k]; }).sort(function (x, y) {
      if (y.pts !== x.pts) return y.pts - x.pts;
      var gdDiff = (y.gf - y.ga) - (x.gf - x.ga);
      if (gdDiff !== 0) return gdDiff;
      return y.awayGf - x.awayGf;
    });
  }

  var QUALIFY_SPOTS = 2;
  var FORM_PIP_LABEL = { W: 'Win', D: 'Draw', L: 'Loss' };

  function renderForm(form) {
    var recent = form.slice(-5);
    if (!recent.length) return '<span class="form-pip form-pip--empty">&mdash;</span>';
    return recent.map(function (r) {
      return '<span class="form-pip form-pip--' + r.toLowerCase() + '" title="' + FORM_PIP_LABEL[r] + '">' + r + '</span>';
    }).join('');
  }

  function renderStandingsTable(rows) {
    var rowsHtml = rows.map(function (r, i) {
      var gd = r.gf - r.ga;
      var qualifies = i < QUALIFY_SPOTS;
      return '<tr class="' + (qualifies ? 'qualifies' : '') + '"><td><span class="pos-chip">' + (i + 1) + '</span></td><td>' + escapeHtml(r.team) + '</td><td>' + r.p +
        '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + (gd > 0 ? '+' + gd : gd) +
        '</td><td class="pts">' + r.pts + '</td></tr>';
    }).join('');

    var qualifiedNames = rows.slice(0, QUALIFY_SPOTS).map(function (r) { return r.team; });
    var formRows = rows.map(function (r) {
      return '<div class="form-row"><span class="form-row__team">' + escapeHtml(r.team) + '</span><span class="form-row__pips">' + renderForm(r.form) + '</span></div>';
    }).join('');

    return (
      '<div class="standings">' +
        '<div class="standings__header">Standings</div>' +
        '<table>' +
          '<thead><tr><th>Pos</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
        '<div class="standings__note">Top ' + QUALIFY_SPOTS + ' advance to the quarter-finals &middot; tiebreaker: points &rarr; goal difference &rarr; away goals</div>' +
        '<div class="standings__header">Recent Form</div>' +
        '<div class="form-list">' + formRows + '</div>' +
        '<div class="standings__note">Currently qualifying: <strong>' + qualifiedNames.map(escapeHtml).join('</strong>, <strong>') + '</strong></div>' +
      '</div>'
    );
  }

  function renderGroupRow(g) {
    return (
      '<section class="group-row">' +
        '<h2 class="section-title">' + escapeHtml(g.group) + '</h2>' +
        '<div class="group-row__grid">' +
          '<div class="competition-block">' +
            '<div class="competition-block__header">Fixtures</div>' +
            '<div class="fixtures">' + groupIntoTies(g.matches).map(renderTie).join('') + '</div>' +
          '</div>' +
          renderStandingsTable(computeStandings(g.matches)) +
        '</div>' +
      '</section>'
    );
  }

  var SLIDE_MS = 10000;
  var latestGroups = [];
  var activeTab = 'home';
  var homeIndex = 0;
  var slideshowTimer = null;
  var slideshowStarted = false;

  function selectTab(tab) {
    activeTab = tab;
    if (activeTab === 'home') {
      homeIndex = 0;
      startSlideshow();
    } else {
      stopSlideshow();
    }
    renderTabs();
    renderContent();
  }

  function startSlideshow() {
    stopSlideshow();
    if (latestGroups.length <= 1) return;
    slideshowTimer = setInterval(function () {
      homeIndex = (homeIndex + 1) % latestGroups.length;
      renderContent();
    }, SLIDE_MS);
  }

  function stopSlideshow() {
    if (slideshowTimer) { clearInterval(slideshowTimer); slideshowTimer = null; }
  }

  function renderTabs() {
    var tabbar = document.getElementById('tabbar');
    var html = '<button class="tab' + (activeTab === 'home' ? ' tab--active' : '') + '" data-tab="home">Home</button>' +
      latestGroups.map(function (g) {
        return '<button class="tab' + (activeTab === g.group ? ' tab--active' : '') + '" data-tab="' + escapeHtml(g.group) + '">' + escapeHtml(g.group) + '</button>';
      }).join('') +
      '<a class="tab tab--link" href="bracket.html">Knockouts</a>';
    tabbar.innerHTML = html;
    Array.prototype.forEach.call(tabbar.querySelectorAll('button.tab'), function (btn) {
      btn.addEventListener('click', function () { selectTab(btn.getAttribute('data-tab')); });
    });
  }

  function renderContent() {
    var container = document.getElementById('groupsContainer');

    if (!latestGroups.length) {
      container.innerHTML = '<div class="empty-state">No fixtures scheduled yet</div>';
      return;
    }

    if (activeTab === 'home') {
      var idx = homeIndex % latestGroups.length;
      var dots = latestGroups.map(function (g, i) {
        return '<button class="' + (i === idx ? 'active' : '') + '" data-index="' + i + '" aria-label="' + escapeHtml(g.group) + '"></button>';
      }).join('');
      container.innerHTML = renderGroupRow(latestGroups[idx]) + (latestGroups.length > 1 ? '<div class="slide-dots">' + dots + '</div>' : '');

      Array.prototype.forEach.call(container.querySelectorAll('.slide-dots button'), function (btn) {
        btn.addEventListener('click', function () {
          homeIndex = Number(btn.getAttribute('data-index'));
          startSlideshow();
          renderContent();
        });
      });
    } else {
      var g = latestGroups.filter(function (x) { return x.group === activeTab; })[0];
      container.innerHTML = g ? renderGroupRow(g) : '<div class="empty-state">That group is gone now &mdash; switched back to Home.</div>';
      if (!g) selectTab('home');
    }
  }

  function load() {
    fetch('data.json?t=' + Date.now()).then(function (r) { return r.json(); }).then(function (data) {
      document.getElementById('tournamentName').textContent = data.tournament.name;
      document.getElementById('tournamentSubtitle').textContent = data.tournament.subtitle || '';

      latestGroups = groupBy(data.matches);
      renderTabs();
      renderContent();

      if (!slideshowStarted) {
        slideshowStarted = true;
        if (activeTab === 'home') startSlideshow();
      }
    });
  }

  load();
  setInterval(load, 15000);
})();
