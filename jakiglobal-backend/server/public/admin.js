let ADMIN_TOKEN = null;

async function adminLogin(){
  const email = document.getElementById('adminEmail').value;
  const password = document.getElementById('adminPassword').value;
  const res = await fetch('/api/admin/login', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ email, password })
  });
  if(!res.ok){ alert('Login failed'); return; }
  const data = await res.json();
  ADMIN_TOKEN = data.token;
  document.getElementById('loginCard').style.display = 'none';
  document.getElementById('dashCard').style.display = 'block';
  loadUsers();
}

async function loadUsers(){
  if(!ADMIN_TOKEN) return;
  const q = document.getElementById('searchEmail').value || '';
  const res = await fetch('/api/admin/users?email='+encodeURIComponent(q), {
    headers: { 'Authorization': 'Bearer ' + ADMIN_TOKEN }
  });
  const data = await res.json();
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML='';
  data.users.forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.email}</td>
      <td>${u.plan}</td>
      <td>${u.subscription_status||''}</td>
      <td>${u.selected_sport||u.purchased_sport||''}</td>
      <td>${u.subscription_id||''}</td>
      <td class="actions">
        <button onclick="overridePlan('${u.email}','demo')">Demo</button>
        <button onclick="overridePlan('${u.email}','studioMonthly')">Studio</button>
        <button onclick="overridePlan('${u.email}','plusMonthly')">Plus</button>
        <button onclick="overridePlan('${u.email}','creatorYearly')">Creator</button>
        <button onclick="overridePlan('${u.email}','proOneTime')">Pro</button>
        <button onclick="cancelSub('${u.subscription_id||''}')">Cancel Sub</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function overridePlan(email, plan){
  if(!ADMIN_TOKEN) return;
  const res = await fetch('/api/admin/override-plan', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+ADMIN_TOKEN},
    body: JSON.stringify({ email, plan })
  });
  if(res.ok){ loadUsers(); } else { alert('Failed to override'); }
}

async function cancelSub(subId){
  if(!ADMIN_TOKEN) return;
  if(!subId){ alert('No subscription id'); return; }
  const res = await fetch('/api/admin/cancel-subscription', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+ADMIN_TOKEN},
    body: JSON.stringify({ subscriptionId: subId })
  });
  if(res.ok){ loadUsers(); } else { alert('Failed to cancel'); }
}
