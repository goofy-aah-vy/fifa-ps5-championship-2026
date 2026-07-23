(function () {
  var loginCard = document.getElementById('loginCard');
  var adminPanel = document.getElementById('adminPanel');

  function api(path, opts) {
    opts = opts || {};
    opts.headers = { 'Content-Type': 'application/json' };
    opts.credentials = 'same-origin';
    if (opts.body) opts.body = JSON.stringify(opts.body);
    return fetch(path, opts).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  function checkSession() {
    api('/api/session').then(function (s) {
      if (s.isAdmin) showAdmin(); else showLogin();
    });
  }

  function showLogin() {
    loginCard.style.display = '';
    adminPanel.style.display = 'none';
  }

  function showAdmin() {
    loginCard.style.display = 'none';
    adminPanel.style.display = '';
    loadMatches();
  }

  document.getElementById('loginBtn').addEventListener('click', function () {
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    var errEl = document.getElementById('loginError');
    errEl.textContent = '';
    api('/api/login', { method: 'POST', body: { username: username, password: password } })
      .then(showAdmin)
      .catch(function (e) { errEl.textContent = e.message; });
  });

  document.getElementById('logoutBtn').addEventListener('click', function () {
    api('/api/logout', { method: 'POST' }).then(showLogin);
  });

  document.getElementById('addMatchBtn').addEventListener('click', function () {
    var teamA = document.getElementById('teamA').value.trim();
    var teamB = document.getElementById('teamB').value.trim();
    var group = document.getElementById('group').value.trim();
    var kickoff = document.getElementById('kickoff').value;
    var errEl = document.getElementById('addError');
    errEl.textContent = '';

    if (!teamA || !teamB || !group || !kickoff) {
      errEl.textContent = 'Team A, Team B, group/stage and kickoff time are required.';
      return;
    }

    api('/api/admin/matches', { method: 'POST', body: { teamA: teamA, teamB: teamB, group: group, kickoff: kickoff } })
      .then(function () {
        document.getElementById('teamA').value = '';
        document.getElementById('teamB').value = '';
        document.getElementById('group').value = '';
        document.getElementById('kickoff').value = '';
        loadMatches();
      })
      .catch(function (e) { errEl.textContent = e.message; });
  });

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function matchRow(m) {
    return (
      '<div class="admin-match-row" data-id="' + m.id + '">' +
        '<strong>' + escapeHtml(m.teamA) + '</strong>' +
        '<input type="number" min="0" class="score-a" value="' + m.scoreA + '" style="width:60px;" />' +
        '<span>-</span>' +
        '<input type="number" min="0" class="score-b" value="' + m.scoreB + '" style="width:60px;" />' +
        '<strong>' + escapeHtml(m.teamB) + '</strong>' +
        '<select class="status">' +
          '<option value="scheduled"' + (m.status === 'scheduled' ? ' selected' : '') + '>Scheduled</option>' +
          '<option value="live"' + (m.status === 'live' ? ' selected' : '') + '>Live</option>' +
          '<option value="finished"' + (m.status === 'finished' ? ' selected' : '') + '>Finished</option>' +
        '</select>' +
        '<button class="secondary save-btn">Save</button>' +
        '<button class="danger delete-btn">Delete</button>' +
      '</div>'
    );
  }

  function groupMatches(matches) {
    var order = [];
    var byGroup = {};
    matches.forEach(function (m) {
      var key = m.group || 'Ungrouped';
      if (!byGroup[key]) { byGroup[key] = []; order.push(key); }
      byGroup[key].push(m);
    });
    return order.map(function (key) { return { group: key, matches: byGroup[key] }; });
  }

  function loadMatches() {
    api('/api/matches').then(function (matches) {
      var list = document.getElementById('matchList');
      if (!matches.length) {
        list.innerHTML = '<p style="color:var(--muted);">No fixtures yet.</p>';
        return;
      }

      list.innerHTML = groupMatches(matches).map(function (g) {
        return '<h3 style="font-size:16px;margin:16px 0 0;color:var(--muted);">' + escapeHtml(g.group) + '</h3>' +
          g.matches.map(matchRow).join('');
      }).join('');

      list.querySelectorAll('.save-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var row = btn.closest('.admin-match-row');
          var id = row.getAttribute('data-id');
          var scoreA = row.querySelector('.score-a').value;
          var scoreB = row.querySelector('.score-b').value;
          var status = row.querySelector('.status').value;
          api('/api/admin/matches/' + id, { method: 'PUT', body: { scoreA: scoreA, scoreB: scoreB, status: status } })
            .then(loadMatches);
        });
      });

      list.querySelectorAll('.delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var row = btn.closest('.admin-match-row');
          var id = row.getAttribute('data-id');
          if (!confirm('Delete this fixture?')) return;
          api('/api/admin/matches/' + id, { method: 'DELETE' }).then(loadMatches);
        });
      });
    });
  }

  checkSession();
})();
