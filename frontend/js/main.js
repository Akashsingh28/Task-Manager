const apiBase = '/api';
let currentUser = null;
let currentProject = null;
let currentProjectId = null;
let chartInstances = {};

// Utilities
const el = (id) => document.getElementById(id);

function setUser(user){ localStorage.setItem('ttm_user', JSON.stringify(user)); }
function getUser(){ return JSON.parse(localStorage.getItem('ttm_user') || 'null'); }
function setToken(t){ localStorage.setItem('ttm_token', t); }
function getToken(){ return localStorage.getItem('ttm_token'); }
function getUserId(){
  return currentUser?._id || currentUser?.id || getUser()?._id || getUser()?.id;
}
function isProjectAdmin(project){
  if (!project || !project.admin) return false;
  const adminId = typeof project.admin === 'object' ? (project.admin._id || project.admin.id) : project.admin;
  return String(adminId) === String(getUserId());
}

async function apiCall(method, path, body = null){
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(apiBase + path, opts);
  return res.json();
}

// Auth
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

el('login-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email = el('login-email').value;
  const password = el('login-password').value;
  const res = await apiCall('POST', '/auth/login', { email, password });
  if (res.token){ setToken(res.token); setUser(res.user); currentUser = res.user; showDashboard(); }
  else alert(res.message || 'Login failed');
});

el('register-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = el('register-name').value;
  const email = el('register-email').value;
  const password = el('register-password').value;
  const res = await apiCall('POST', '/auth/register', { name, email, password });
  if (res.token){ setToken(res.token); setUser(res.user); currentUser = res.user; showDashboard(); }
  else alert(res.message || 'Register failed');
});

el('logout-btn').addEventListener('click', ()=>{
  localStorage.removeItem('ttm_token');
  localStorage.removeItem('ttm_user');
  el('auth-page').style.display = 'block';
  el('dashboard-page').style.display = 'none';
});

function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  const activeTab = document.querySelector('.tab-btn[data-tab="' + tab + '"]');
  if (activeTab) activeTab.classList.add('active');
  el(tab + '-form').classList.add('active');
}

function showDashboard(){
  const user = getUser();
  if (!user) return;
  el('auth-page').style.display = 'none';
  el('dashboard-page').style.display = 'flex';
  el('user-welcome').textContent = `Welcome, ${user.name}`;
  loadDashboardStats();
}

// Views
function switchView(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  el(view + '-view').classList.add('active');
  // Only activate sidebar button if it exists (not for project-detail)
  const sidebarBtn = document.querySelector('.sidebar-btn[onclick*="' + view + '"]');
  if (sidebarBtn) sidebarBtn.classList.add('active');
  if (view === 'projects') loadProjects();
  else if (view === 'stats') loadDashboardStats();
}

function switchProjectTab(tab){
  document.querySelectorAll('.project-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.project-tab-content').forEach(c => c.classList.remove('active'));
  const projectTab = document.querySelector('.project-tab[onclick*="' + tab + '"]');
  if (projectTab) projectTab.classList.add('active');
  el(tab + '-section').classList.add('active');
  
  if (tab === 'tasks') loadProjectTasks();
  if (tab === 'members') loadProjectMembers();
}

// Dashboard
async function loadDashboardStats(){
  const filter = el('dashboard-project-filter');
  const projectId = filter ? filter.value : 'all';
  const url = projectId === 'all' ? '/dashboard' : `/dashboard?projectId=${projectId}`;

  const res = await apiCall('GET', url);
  if (res.message) return alert(res.message);

  if (res.projectsList && filter) {
    const currentValue = filter.value;
    filter.innerHTML = `<option value="all">All Projects</option>` + res.projectsList.map(p => `<option value="${p._id}">${p.name}</option>`).join('');
    filter.value = currentValue || 'all';
  }

  const total = Number(res.totalTasks || 0);
  const byStatus = res.byStatus || {};
  const inProgress = Number(byStatus['In Progress'] || byStatus['InProgress'] || byStatus['In-Progress'] || 0);
  
  el('total-projects').textContent = res.totalProjects || 0;
  el('total-members').textContent = res.totalMembers || 0;
  el('total-tasks').textContent = total;
  el('in-progress-tasks').textContent = inProgress;

  renderCharts(res);
}

function renderCharts(res) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'Poppins' } } }
    }
  };

  // Status Chart
  if (chartInstances.status) chartInstances.status.destroy();
  const byStatus = res.byStatus || {};
  chartInstances.status = new Chart(el('statusChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(byStatus),
      datasets: [{
        data: Object.values(byStatus),
        backgroundColor: ['#5b3ee6', '#50bfa3', '#df6f98', '#9b8cff']
      }]
    },
    options: chartOptions
  });

  // Priority Chart
  if (chartInstances.priority) chartInstances.priority.destroy();
  const byPriority = res.byPriority || {};
  chartInstances.priority = new Chart(el('priorityChart'), {
    type: 'pie',
    data: {
      labels: Object.keys(byPriority),
      datasets: [{
        data: Object.values(byPriority),
        backgroundColor: ['#df6f98', '#9b8cff', '#50bfa3']
      }]
    },
    options: chartOptions
  });

  // User Chart
  if (chartInstances.user) chartInstances.user.destroy();
  const userStats = res.byUser || [];
  chartInstances.user = new Chart(el('userChart'), {
    type: 'bar',
    data: {
      labels: userStats.map(u => u.user),
      datasets: [{
        label: 'Assigned Tasks',
        data: userStats.map(u => u.count),
        backgroundColor: '#7c5cff',
        borderRadius: 4
      }]
    },
    options: {
      ...chartOptions,
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 } }
      }
    }
  });
}


// Projects
async function loadProjects(){
  const res = await apiCall('GET', '/projects');
  if (res.message) return alert(res.message);
  
  el('projects-list').innerHTML = (res || []).map(p => `
    <div class="project-card" onclick="openProject('${p._id}')">
      <h3>${p.name}</h3>
      <p>${p.description || 'No description'}</p>
      <small>Members: ${(p.members || []).length}</small>
    </div>
  `).join('');
}

async function openProject(id){
  const res = await apiCall('GET', '/projects/' + id);
  if (res.message) return alert(res.message);
  
  currentProject = res;
  currentProjectId = id;
  
  el('project-header').innerHTML = `<h2>${res.name}</h2><p>${res.description || ''}</p>`;
  switchView('project-detail');
  switchProjectTab('tasks');
}

async function loadProjectTasks(){
  if (currentProjectId) {
    const proj = await apiCall('GET', '/projects/' + currentProjectId);
    if (!proj || proj.message) console.warn('Could not refresh project data', proj.message);
    else currentProject = proj;
  }
  const res = await apiCall('GET', '/tasks/project/' + currentProjectId);
  if (res.message) return alert(res.message);
  
  const isAdmin = isProjectAdmin(currentProject);
  const columns = currentProject.columns || ['To Do', 'In Progress', 'Done'];
  const tasks = res || [];

  el('kanban-board').innerHTML = columns.map(col => `
    <div class="kanban-column" ondragover="allowDrop(event)" ondrop="drop(event, '${col}')">
      <div class="kanban-header">${col} (${tasks.filter(t => (t.status || 'To Do') === col).length})</div>
      <div class="kanban-tasks" id="col-${col.replace(/\s+/g, '-')}">
        ${tasks.filter(t => (t.status || 'To Do') === col).map(t => `
          <div class="task-item" draggable="true" ondragstart="drag(event, '${t._id}')">
            <div class="task-info">
              <h4>${t.title}</h4>
              <p>${t.description || ''}</p>
              <small>Due: ${t.dueDate ? new Date(t.dueDate).toDateString() : 'No date'} | Priority: ${t.priority}</small>
              <div>Assignee: ${t.assignee ? (t.assignee.name || t.assignee.email || t.assignee) : 'Unassigned'}</div>
            </div>
            <div class="task-actions">
              <div class="task-actions-top">
                ${isAdmin ? `<button class="task-delete-btn" onclick="deleteTask('${t._id}')">Delete</button>` : ''}
              </div>
              <div class="task-actions-middle">
                ${isAdmin ? `
                  <select class="task-assign-select" onchange="assignTask('${t._id}', this.value)">
                    <option value="">Assign to...</option>
                    ${(currentProject.members || []).map(m => {
                      const mid = (typeof m === 'object') ? m._id : m;
                      const assigneeId = t.assignee ? (typeof t.assignee === 'object' ? (t.assignee._id || t.assignee) : t.assignee) : '';
                      return `<option value="${mid}" ${String(assigneeId) === String(mid) ? 'selected' : ''}>${m.name || m.email}</option>`;
                    }).join('')}
                  </select>
                ` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

// Drag & Drop
function allowDrop(ev) {
  ev.preventDefault();
}
function drag(ev, taskId) {
  ev.dataTransfer.setData("taskId", taskId);
}
async function drop(ev, newCol) {
  ev.preventDefault();
  const taskId = ev.dataTransfer.getData("taskId");
  if (!taskId) return;
  await updateTaskStatus(taskId, newCol);
}

async function addColumn() {
  const colName = prompt("Enter new column name:");
  if (!colName) return;
  const res = await apiCall('POST', '/projects/' + currentProjectId + '/columns', { column: colName });
  if (res.message) return alert(res.message);
  currentProject = res;
  loadProjectTasks();
}

async function assignTask(taskId, assigneeId){
  if (!assigneeId) return;
  showToast('Assigning...', true);
  const res = await apiCall('PATCH', '/tasks/' + taskId + '/assign', { assigneeId });
  if (res.message) {
    showToast(res.message, false);
    return;
  }
  showToast('Assigned successfully', true);
  // refresh tasks to reflect populated assignee
  await loadProjectTasks();
}

// Simple toast notifications
function showToast(msg, success = true){
  // fallback to alert for very small setups
  try{
    let toast = document.getElementById('ttm-toast');
    if (!toast){
      toast = document.createElement('div');
      toast.id = 'ttm-toast';
      toast.style.position = 'fixed';
      toast.style.right = '20px';
      toast.style.bottom = '20px';
      toast.style.padding = '12px 18px';
      toast.style.borderRadius = '8px';
      toast.style.color = '#fff';
      toast.style.zIndex = 2000;
      document.body.appendChild(toast);
    }
    toast.style.background = success ? 'rgba(46, 204, 113, 0.95)' : 'rgba(231, 76, 60, 0.95)';
    toast.textContent = msg;
    toast.style.display = 'block';
    setTimeout(()=>{ toast.style.display = 'none'; }, 3000);
  }catch(e){
    alert(msg);
  }
}

async function loadProjectMembers(){
  const isAdmin = isProjectAdmin(currentProject);
  el('members-list').innerHTML = (currentProject.members || []).map(m => `
    <div class="member-item">
      <span>${m.name || m.email}</span>
      ${isAdmin ? `<button onclick="removeMember('${m._id}')">Remove</button>` : ''}
    </div>
  `).join('');

  const addForm = el('add-member-form');
  if (addForm) addForm.style.display = isAdmin ? 'flex' : 'none';
}

async function updateTaskStatus(taskId, status){
  if (!status) return;
  const res = await apiCall('PATCH', '/tasks/' + taskId + '/status', { status });
  if (res.message) return alert(res.message);
  loadProjectTasks();
}

async function deleteTask(taskId){
  if (!confirm('Delete this task?')) return;
  const res = await apiCall('DELETE', '/tasks/' + taskId);
  if (res.message) { alert(res.message); return; }
  loadProjectTasks();
}

async function removeMember(userId){
  if (!confirm('Remove this member?')) return;
  const res = await apiCall('DELETE', '/projects/' + currentProjectId + '/members/' + userId);
  if (res.message) return alert(res.message);
  currentProject = res;
  loadProjectMembers();
}

el('add-member-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (!isProjectAdmin(currentProject)) {
    showToast('Only project admin can add members', false);
    return;
  }
  const email = el('member-email').value.trim();
  if (!email) return;
  const res = await apiCall('POST', '/projects/' + currentProjectId + '/members', { email });
  if (res.message) {
    showToast(res.message, false);
    return;
  }
  currentProject = res;
  el('member-email').value = '';
  showToast('Member added successfully', true);
  loadProjectMembers();
});

// Modals
function openCreateProjectModal(){
  el('create-project-modal').classList.add('active');
}

function openCreateTaskModal(){
  el('create-task-modal').classList.add('active');
}

function closeModals(){
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
}

el('create-project-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const name = el('project-name').value;
  const description = el('project-desc').value;
  const res = await apiCall('POST', '/projects', { name, description });
  if (res.message) return alert(res.message);
  closeModals();
  el('project-name').value = '';
  el('project-desc').value = '';
  loadProjects();
});

el('create-task-form').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const title = el('task-title').value;
  const description = el('task-desc').value;
  const dueDate = el('task-due').value;
  const priority = el('task-priority').value;
  const res = await apiCall('POST', '/tasks', { 
    title, description, dueDate, priority, projectId: currentProjectId 
  });
  if (res.message) return alert(res.message);
  closeModals();
  el('task-title').value = '';
  el('task-desc').value = '';
  el('task-due').value = '';
  loadProjectTasks();
});

// Init
if (getToken() && getUser()) {
  currentUser = getUser();
  showDashboard();
}

