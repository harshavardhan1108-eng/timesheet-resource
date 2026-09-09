// Employee ID Login & 360° Profile Details Portal Component
const LoginPortalView = {
  currentEmployeeData: null,

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6 fade-in max-w-5xl mx-auto">
        
        <!-- Search & Login Header Card -->
        <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl border border-slate-800">
          <div class="max-w-2xl mx-auto text-center space-y-4">
            <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md border border-white/10 text-blue-300">
              <i data-lucide="shield-check" class="w-4 h-4"></i>
              <span>Employee Access & Profile Directory</span>
            </div>

            <h2 class="text-3xl font-black tracking-tight text-white">
              Employee ID Lookup & Portal
            </h2>
            <p class="text-xs text-slate-300 leading-relaxed">
              Enter an Employee ID to view their full profile, project assignments, financial rates, timesheet logs, and switch active session.
            </p>

            <!-- Search Form -->
            <form onsubmit="LoginPortalView.handleSearch(event)" class="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <div class="relative flex-1 w-full">
                <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2"></i>
                <input type="text" id="employee-id-input" placeholder="Enter Employee ID (e.g. EMP-104, EMP-101, or 4)" value="${Store.currentUser?.employee_code || 'EMP-104'}" class="w-full pl-11 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 backdrop-blur-md">
              </div>
              <button type="submit" class="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-2xl transition shadow-md flex items-center justify-center gap-2">
                <span>Search Profile</span>
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
              </button>
            </form>

            <!-- Quick Demo Chips -->
            <div class="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span class="text-slate-400 font-medium">Quick Demo IDs:</span>
              <button type="button" onclick="LoginPortalView.quickSearch('EMP-104')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-blue-200 font-mono transition">EMP-104 (Engineer)</button>
              <button type="button" onclick="LoginPortalView.quickSearch('EMP-106')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 font-mono transition">EMP-106 (Designer)</button>
              <button type="button" onclick="LoginPortalView.quickSearch('EMP-102')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-amber-200 font-mono transition">EMP-102 (Manager)</button>
              <button type="button" onclick="LoginPortalView.quickSearch('EMP-101')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-200 font-mono transition">EMP-101 (Admin)</button>
              <button type="button" onclick="LoginPortalView.quickSearch('EMP-108')" class="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-rose-200 font-mono transition">EMP-108 (QA)</button>
            </div>
          </div>
        </div>

        <!-- Employee Details Result Container -->
        <div id="employee-details-result">
          <div class="text-center py-8 text-slate-400 text-sm">Loading employee profile...</div>
        </div>

      </div>
    `;

    lucide.createIcons({ root: container });
    
    // Auto load current user or EMP-104
    const initialQuery = Store.currentUser?.employee_code || 'EMP-104';
    await this.fetchEmployee(initialQuery);
  },

  async handleSearch(e) {
    if (e) e.preventDefault();
    const query = document.getElementById('employee-id-input').value.trim();
    if (!query) {
      showToast('Please enter an Employee ID or name', 'info');
      return;
    }
    await this.fetchEmployee(query);
  },

  quickSearch(empCode) {
    document.getElementById('employee-id-input').value = empCode;
    this.fetchEmployee(empCode);
  },

  async fetchEmployee(query) {
    const container = document.getElementById('employee-details-result');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-12 text-slate-400 text-sm">Fetching employee profile for <strong>${query}</strong>...</div>`;

    try {
      const data = await API.get(`/api/auth/employee/${encodeURIComponent(query)}`);
      this.currentEmployeeData = data;
      this.renderProfileDetails(container, data);
    } catch (e) {
      container.innerHTML = `
        <div class="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm text-center max-w-md mx-auto fade-in">
          <div class="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="user-x" class="w-6 h-6"></i>
          </div>
          <h4 class="font-bold text-slate-800 text-base">Employee Not Found</h4>
          <p class="text-xs text-slate-500 mt-1">No employee matches ID <strong>"${query}"</strong>. Please check the spelling or select a quick demo ID above.</p>
        </div>
      `;
      lucide.createIcons({ root: container });
    }
  },

  renderProfileDetails(container, emp) {
    const isCurrentlyActive = Store.currentUser && Store.currentUser.id === emp.id;
    const util = emp.utilization_rate || 0;
    
    let utilBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
    if (util > 100) utilBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
    else if (util >= 75) utilBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        
        <!-- Profile Identity Card -->
        <div class="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-5">
            <img src="${emp.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200 shadow-sm" alt="">
            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h3 class="text-2xl font-black text-slate-900">${emp.name}</h3>
                <span class="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-mono font-bold border border-blue-200">
                  ${emp.employee_code || `EMP-${emp.id}`}
                </span>
                <span class="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">
                  ${emp.role}
                </span>
              </div>

              <p class="text-sm font-semibold text-slate-600">${emp.job_title} • <span class="text-blue-600">${emp.department}</span></p>
              
              <div class="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
                <span class="flex items-center gap-1"><i data-lucide="mail" class="w-3.5 h-3.5"></i> ${emp.email}</span>
                <span class="flex items-center gap-1"><i data-lucide="phone" class="w-3.5 h-3.5"></i> ${emp.phone || '+1 (555) 000-0000'}</span>
                <span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i> ${emp.location || 'HQ Office'}</span>
                <span class="flex items-center gap-1"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> Joined ${Store.formatDate(emp.hire_date) || '2024'}</span>
              </div>
            </div>
          </div>

          <!-- Session Controls -->
          <div class="flex flex-col sm:flex-row md:flex-col items-stretch gap-2.5 md:min-w-[200px]">
            ${isCurrentlyActive ? `
              <div class="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-600"></i>
                <span>Currently Logged In</span>
              </div>
            ` : `
              <button onclick="LoginPortalView.loginAsThisEmployee(${emp.id})" class="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm flex items-center justify-center gap-2">
                <i data-lucide="log-in" class="w-4 h-4"></i>
                <span>Log In As ${emp.name.split(' ')[0]}</span>
              </button>
            `}

            <button onclick="App.navigate('timesheets')" class="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-2">
              <i data-lucide="clock" class="w-4 h-4"></i>
              <span>View Weekly Timesheet</span>
            </button>
          </div>
        </div>

        <!-- 4 KPI Metrics Strip -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Billable Rate</span>
            <p class="text-xl font-black text-slate-800 mt-1">$${emp.hourly_rate}<span class="text-xs font-normal text-slate-400">/hr</span></p>
            <p class="text-[11px] text-slate-400 mt-0.5">Client Billing Rate</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Internal Cost Rate</span>
            <p class="text-xl font-black text-slate-800 mt-1">$${emp.cost_rate}<span class="text-xs font-normal text-slate-400">/hr</span></p>
            <p class="text-[11px] text-slate-400 mt-0.5">Gross Internal Cost</p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Weekly Capacity</span>
            <p class="text-xl font-black text-slate-800 mt-1">${emp.weekly_capacity}h</p>
            <p class="text-[11px] text-slate-400 mt-0.5">Assigned: <strong class="text-slate-700">${emp.current_allocated_hours || 0}h/wk</strong></p>
          </div>

          <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staffing Utilization</span>
            <p class="text-xl font-black ${util > 100 ? 'text-rose-600' : 'text-blue-600'} mt-1">${util}%</p>
            <p class="text-[11px] text-slate-400 mt-0.5">${util > 100 ? 'Overloaded' : util >= 75 ? 'Optimal' : 'Available'}</p>
          </div>
        </div>

        <!-- Skills & Specializations -->
        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Skills & Technical Competencies</h4>
          <div class="flex flex-wrap gap-2">
            ${(emp.skills || []).map(s => `
              <span class="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">${s}</span>
            `).join('')}
          </div>
        </div>

        <!-- Active Project Allocations Table -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h4 class="font-bold text-slate-800 text-sm">Assigned Project Allocations (${emp.allocations.length})</h4>
            <button onclick="App.openAllocationModal(${emp.id})" class="text-xs font-bold text-blue-600 hover:text-blue-700">+ Add Allocation</button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th class="py-3 px-4">Project</th>
                  <th class="py-3 px-3">Role on Project</th>
                  <th class="py-3 px-3 text-center">Hours / Week</th>
                  <th class="py-3 px-3">Schedule Range</th>
                  <th class="py-3 px-4">Phase / Notes</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${emp.allocations.length === 0 ? `
                  <tr><td colspan="5" class="py-6 text-center text-slate-400">No project allocations currently assigned.</td></tr>
                ` : emp.allocations.map(a => `
                  <tr class="hover:bg-slate-50/50 transition">
                    <td class="py-3.5 px-4 font-bold text-slate-800">
                      <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${a.project_color || '#3B82F6'}"></span>
                        <span>${a.project_name}</span>
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">${a.project_code}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-3 font-semibold text-slate-700">${a.role || 'Contributor'}</td>
                    <td class="py-3.5 px-3 text-center font-bold text-blue-600">${a.hours_per_week} hrs/wk</td>
                    <td class="py-3.5 px-3 text-slate-500">${Store.formatDate(a.start_date)} – ${Store.formatDate(a.end_date)}</td>
                    <td class="py-3.5 px-4 text-slate-600 max-w-xs truncate">${a.notes || 'Scheduled allocation'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Timesheet History & Recent Submissions -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h4 class="font-bold text-slate-800 text-sm">Recent Timesheet Submissions (${emp.timesheets.length})</h4>
            <span class="text-xs text-slate-500">Lifetime Hours Logged: <strong class="text-slate-800">${emp.lifetime_hours}h</strong></span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th class="py-3 px-4">Period</th>
                  <th class="py-3 px-3 text-center">Total Hours</th>
                  <th class="py-3 px-3 text-center">Billable Hours</th>
                  <th class="py-3 px-3 text-center">Status</th>
                  <th class="py-3 px-4">Reviewer / Feedback</th>
                  <th class="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${emp.timesheets.length === 0 ? `
                  <tr><td colspan="6" class="py-6 text-center text-slate-400">No timesheets submitted yet.</td></tr>
                ` : emp.timesheets.map(t => {
                  let badge = '';
                  if (t.status === 'submitted') badge = '<span class="px-2.5 py-1 text-[11px] font-semibold rounded-full badge-submitted">Pending Approval</span>';
                  else if (t.status === 'approved') badge = '<span class="px-2.5 py-1 text-[11px] font-semibold rounded-full badge-approved">Approved</span>';
                  else if (t.status === 'rejected') badge = '<span class="px-2.5 py-1 text-[11px] font-semibold rounded-full badge-rejected">Revision Needed</span>';
                  else badge = '<span class="px-2.5 py-1 text-[11px] font-semibold rounded-full badge-draft">Draft</span>';

                  return `
                    <tr class="hover:bg-slate-50/50 transition">
                      <td class="py-3 px-4 font-bold text-slate-800">Week of ${Store.formatWeekRange(t.week_start_date)}</td>
                      <td class="py-3 px-3 text-center font-black text-slate-800">${t.total_hours}h</td>
                      <td class="py-3 px-3 text-center font-bold text-blue-600">${t.billable_hours}h</td>
                      <td class="py-3 px-3 text-center">${badge}</td>
                      <td class="py-3 px-4 text-slate-600 max-w-xs truncate">
                        ${t.rejection_reason ? `<span class="text-rose-600 font-semibold">Note: ${t.rejection_reason}</span>` : t.approver_name ? `Approved by ${t.approver_name}` : '—'}
                      </td>
                      <td class="py-3 px-3 text-right">
                        <button onclick="LoginPortalView.openTimesheetForWeek('${t.week_start_date}', ${emp.id})" class="text-xs font-bold text-blue-600 hover:text-blue-700">Open</button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    lucide.createIcons({ root: container });
  },

  loginAsThisEmployee(userId) {
    App.onUserSwitched(userId);
    this.renderProfileDetails(document.getElementById('employee-details-result'), this.currentEmployeeData);
    showToast(`Logged in as ${this.currentEmployeeData.name} (${this.currentEmployeeData.employee_code}) 🎉`);
  },

  openTimesheetForWeek(weekStartStr, userId) {
    if (Store.currentUser.id !== userId) {
      App.onUserSwitched(userId);
    }
    TimesheetsView.activeWeekStart = weekStartStr;
    App.navigate('timesheets');
  }
};
