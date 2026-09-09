// Project Gantt & Milestone Timeline View Component
const GanttView = {
  statusFilter: 'all',
  timelineStart: new Date('2026-06-01T00:00:00'),
  timelineEnd: new Date('2027-03-31T23:59:59'),
  months: [
    { label: 'Jun 2026', start: new Date('2026-06-01'), end: new Date('2026-06-30') },
    { label: 'Jul 2026', start: new Date('2026-07-01'), end: new Date('2026-07-31') },
    { label: 'Aug 2026', start: new Date('2026-08-01'), end: new Date('2026-08-31') },
    { label: 'Sep 2026', start: new Date('2026-09-01'), end: new Date('2026-09-30') },
    { label: 'Oct 2026', start: new Date('2026-10-01'), end: new Date('2026-10-31') },
    { label: 'Nov 2026', start: new Date('2026-11-01'), end: new Date('2026-11-30') },
    { label: 'Dec 2026', start: new Date('2026-12-01'), end: new Date('2026-12-31') },
    { label: 'Jan 2027', start: new Date('2027-01-01'), end: new Date('2027-01-31') },
    { label: 'Feb 2027', start: new Date('2027-02-01'), end: new Date('2027-02-28') },
    { label: 'Mar 2027', start: new Date('2027-03-01'), end: new Date('2027-03-31') }
  ],

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6 fade-in">
        
        <!-- Controls & Filter Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <!-- Status Filter -->
          <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button id="gantt-tab-all" onclick="GanttView.setStatusFilter('all')" class="px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm">
              All Projects
            </button>
            <button id="gantt-tab-active" onclick="GanttView.setStatusFilter('active')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              Active
            </button>
            <button id="gantt-tab-planning" onclick="GanttView.setStatusFilter('planning')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              Planning
            </button>
          </div>

          <!-- Actions & Legend -->
          <div class="flex flex-wrap items-center gap-4">
            <div class="hidden md:flex items-center gap-3 text-xs font-medium text-slate-500">
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Completed</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-blue-500"></span> In Progress</span>
              <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Planned</span>
            </div>

            <button onclick="GanttView.openAddMilestoneModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm">
              <i data-lucide="flag" class="w-4 h-4"></i>
              <span>+ Add Milestone</span>
            </button>
          </div>
        </div>

        <!-- Gantt Chart Container -->
        <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="gantt-main-card">
          <div class="p-4 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
            <h4 class="font-bold text-slate-800 text-sm">Project Roadmap & Milestone Schedule (10-Month Horizon)</h4>
            <span class="text-xs text-slate-400">June 2026 — March 2027</span>
          </div>

          <div class="overflow-x-auto" id="gantt-scroll-container">
            <div class="min-w-[1100px] p-4">
              
              <!-- Timeline Month Header Ruler -->
              <div class="grid grid-cols-12 gap-0 border-b border-slate-200 pb-3 mb-4 text-xs font-bold text-slate-500">
                <div class="col-span-3 text-slate-700 uppercase tracking-wider pl-2">Project & Deliverables</div>
                <div class="col-span-9 grid grid-cols-10 gap-0 text-center text-[11px]">
                  ${this.months.map(m => `
                    <div class="border-l border-slate-200/60 py-1 font-mono">${m.label}</div>
                  `).join('')}
                </div>
              </div>

              <!-- Projects & Milestones Track List -->
              <div id="gantt-tracks-list" class="space-y-6">
                <div class="text-center py-12 text-slate-400 text-sm">Loading Gantt timeline...</div>
              </div>

            </div>
          </div>
        </div>

      </div>
    `;

    lucide.createIcons({ root: container });
    await this.loadGanttData();
  },

  setStatusFilter(status) {
    this.statusFilter = status;
    ['all', 'active', 'planning'].forEach(s => {
      const btn = document.getElementById(`gantt-tab-${s}`);
      if (btn) {
        if (s === status) {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm';
        } else {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900';
        }
      }
    });
    this.loadGanttData();
  },

  async loadGanttData() {
    const container = document.getElementById('gantt-tracks-list');
    if (!container) return;

    try {
      const data = await API.get('/api/gantt', { status: this.statusFilter });
      const projects = data.projects;

      if (projects.length === 0) {
        container.innerHTML = `<p class="text-center py-12 text-slate-400 text-xs">No projects found for this status.</p>`;
        return;
      }

      const totalDurationDays = (this.timelineEnd - this.timelineStart) / (1000 * 60 * 60 * 24);

      container.innerHTML = projects.map(p => {
        const pStart = new Date(p.start_date + 'T00:00:00');
        const pEnd = p.end_date ? new Date(p.end_date + 'T23:59:59') : new Date('2026-12-31T23:59:59');

        // Calculate left % and width %
        const startDiffDays = Math.max(0, (pStart - this.timelineStart) / (1000 * 60 * 60 * 24));
        const durationDays = Math.max(15, (pEnd - pStart) / (1000 * 60 * 60 * 24));
        
        const leftPercent = Math.min(100, Math.max(0, (startDiffDays / totalDurationDays) * 100));
        const widthPercent = Math.min(100 - leftPercent, Math.max(8, (durationDays / totalDurationDays) * 100));

        return `
          <div class="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:border-slate-200 transition">
            
            <!-- Project Bar Row -->
            <div class="grid grid-cols-12 gap-0 items-center mb-3">
              <!-- Left: Project Info -->
              <div class="col-span-3 pr-4">
                <div class="flex items-center gap-2">
                  <span class="w-3 h-3 rounded-full flex-shrink-0" style="background-color: ${p.color || '#3B82F6'}"></span>
                  <h5 class="font-bold text-slate-900 text-sm truncate">${p.name}</h5>
                </div>
                <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span class="font-mono font-semibold text-slate-600">${p.code}</span>
                  <span>•</span>
                  <span>${p.client_name || 'Internal'}</span>
                  <span>•</span>
                  <span class="font-bold text-slate-700">${p.logged_hours}h / ${p.budget_hours}h</span>
                </div>
              </div>

              <!-- Right: Gantt Track -->
              <div class="col-span-9 relative h-10 flex items-center bg-white rounded-xl border border-slate-100 px-1">
                <!-- Grid background lines -->
                <div class="absolute inset-0 grid grid-cols-10 pointer-events-none opacity-40">
                  ${Array.from({ length: 10 }).map(() => `<div class="border-r border-slate-200 h-full"></div>`).join('')}
                </div>

                <!-- Main Project Span Bar -->
                <div class="absolute h-7 rounded-xl shadow-xs flex items-center justify-between px-3 text-white text-xs font-bold transition-all duration-300"
                     style="left: ${leftPercent}%; width: ${widthPercent}%; background-color: ${p.color || '#3B82F6'}; opacity: 0.9;">
                  <span class="truncate pr-2">${p.name} (${p.progress_percentage || 0}%)</span>
                  <span class="text-[10px] font-mono opacity-80 whitespace-nowrap">${Store.formatDate(p.start_date)} – ${Store.formatDate(p.end_date)}</span>
                </div>
              </div>
            </div>

            <!-- Milestones Sub-Track -->
            <div class="grid grid-cols-12 gap-0 items-start pt-2 border-t border-slate-200/50">
              <div class="col-span-3 pr-4 text-xs font-semibold text-slate-500 flex items-center gap-1.5 pt-1">
                <i data-lucide="milestone" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>Milestones (${p.milestones.length})</span>
                <button onclick="GanttView.openAddMilestoneModal(${p.id})" class="text-[10px] text-blue-600 hover:text-blue-700 font-bold ml-auto">+ Add</button>
              </div>

              <!-- Milestones Timeline Strip -->
              <div class="col-span-9 relative min-h-[44px] flex flex-col gap-1.5 py-1">
                ${p.milestones.length === 0 ? `
                  <span class="text-[11px] text-slate-400 italic pl-2 pt-1">No milestones scheduled yet.</span>
                ` : p.milestones.map(m => {
                  const mStart = new Date(m.start_date + 'T00:00:00');
                  const mDue = new Date(m.due_date + 'T23:59:59');
                  const mStartDays = Math.max(0, (mStart - this.timelineStart) / (1000 * 60 * 60 * 24));
                  const mDuration = Math.max(10, (mDue - mStart) / (1000 * 60 * 60 * 24));

                  const mLeft = Math.min(95, Math.max(0, (mStartDays / totalDurationDays) * 100));
                  const mWidth = Math.min(100 - mLeft, Math.max(12, (mDuration / totalDurationDays) * 100));

                  let statusBg = 'bg-blue-100 text-blue-800 border-blue-300';
                  let icon = 'clock';
                  if (m.status === 'completed') {
                    statusBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                    icon = 'check-circle-2';
                  } else if (m.status === 'in_progress') {
                    statusBg = 'bg-indigo-100 text-indigo-800 border-indigo-300';
                    icon = 'play-circle';
                  }

                  return `
                    <div class="relative h-7 flex items-center">
                      <div class="absolute flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold shadow-xs cursor-pointer hover:shadow-md transition ${statusBg}"
                           style="left: ${mLeft}%; width: ${mWidth}%;"
                           onclick='GanttView.openMilestoneDetails(${JSON.stringify(m).replace(/'/g, "&apos;")}, "${p.name.replace(/'/g, "\\'")}")'
                           title="${m.title} (${m.status}): ${Store.formatDate(m.start_date)} to ${Store.formatDate(m.due_date)}">
                        <i data-lucide="${icon}" class="w-3 h-3 flex-shrink-0"></i>
                        <span class="truncate flex-1">${m.title}</span>
                        <span class="text-[9px] font-mono opacity-80">${m.progress}%</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Team Avatars Row -->
            <div class="grid grid-cols-12 gap-0 items-center pt-2 mt-1">
              <div class="col-span-3 text-[11px] text-slate-400">Assigned Team:</div>
              <div class="col-span-9 flex items-center gap-2 pl-2">
                ${p.team.length === 0 ? `
                  <span class="text-[11px] text-slate-400 italic">No resources allocated</span>
                ` : p.team.map(t => `
                  <div class="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-xs" title="${t.name} (${t.role}): ${t.hours_per_week}h/wk">
                    <img src="${t.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-4 h-4 rounded-full object-cover" alt="">
                    <span class="text-[10px] font-bold text-slate-700">${t.name.split(' ')[0]}</span>
                    <span class="text-[9px] text-blue-600 font-bold">${t.hours_per_week}h</span>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>
        `;
      }).join('');

      lucide.createIcons({ root: container });
    } catch (e) {
      console.error('Failed to load Gantt data', e);
    }
  },

  async openAddMilestoneModal(projectId = null) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    let projects = [];
    try {
      projects = await API.get('/api/projects');
    } catch (e) {}

    const todayStr = new Date().toISOString().split('T')[0];
    const dueStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 class="font-bold text-slate-900 text-lg">Add Project Milestone / Phase</h4>
            <p class="text-xs text-slate-500">Define major roadmap deliverable and timeline</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="add-milestone-form" onsubmit="GanttView.submitNewMilestone(event)" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Project *</label>
            <select name="project_id" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
              ${projects.map(p => `
                <option value="${p.id}" ${projectId === p.id ? 'selected' : ''}>${p.name} (${p.code})</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Milestone Title *</label>
            <input type="text" name="title" required placeholder="e.g. Phase 2: Beta Launch & QA Testing" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Description / Deliverable Specs</label>
            <textarea name="description" rows="2" placeholder="Key deliverables and acceptance criteria..." class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input type="date" name="start_date" value="${todayStr}" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Due / Target Date *</label>
              <input type="date" name="due_date" value="${dueStr}" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select name="status" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="planned">Planned / Upcoming</option>
                <option value="in_progress" selected>In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Progress (%)</label>
              <input type="number" name="progress" min="0" max="100" value="25" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">Save Milestone</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async submitNewMilestone(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      project_id: parseInt(form.project_id.value),
      title: form.title.value.trim(),
      description: form.description.value.trim(),
      start_date: form.start_date.value,
      due_date: form.due_date.value,
      status: form.status.value,
      progress: parseInt(form.progress.value) || 0
    };

    try {
      await API.post(`/api/projects/${payload.project_id}/milestones`, payload);
      showToast('Milestone created on roadmap! 🚩');
      App.closeModal();
      this.loadGanttData();
    } catch (err) {}
  },

  openMilestoneDetails(m, projectName) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 class="font-bold text-slate-900 text-lg">${m.title}</h4>
            <p class="text-xs text-slate-500">${projectName}</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-slate-600">${m.description || 'No detailed specifications provided.'}</p>

          <div class="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl text-xs">
            <div>
              <span class="text-slate-400 block font-semibold text-[10px] uppercase">Timeline</span>
              <strong class="text-slate-800">${Store.formatDate(m.start_date)} – ${Store.formatDate(m.due_date)}</strong>
            </div>
            <div>
              <span class="text-slate-400 block font-semibold text-[10px] uppercase">Completion</span>
              <strong class="text-blue-600">${m.progress}% (${m.status})</strong>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <button onclick="GanttView.updateMilestoneStatus(${m.id}, 'completed', 100)" class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition">
              Mark Completed (100%)
            </button>
            <button onclick="GanttView.deleteMilestone(${m.id})" class="py-2 px-3 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold transition">
              Delete
            </button>
          </div>
        </div>

        <div class="flex justify-end pt-4 border-t border-slate-100 mt-4">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async updateMilestoneStatus(milestoneId, status, progress) {
    try {
      await API.put(`/api/milestones/${milestoneId}`, { status, progress });
      showToast('Milestone updated successfully!');
      App.closeModal();
      this.loadGanttData();
    } catch (e) {}
  },

  async deleteMilestone(milestoneId) {
    if (!confirm('Are you sure you want to remove this milestone from the timeline?')) return;
    try {
      await API.delete(`/api/milestones/${milestoneId}`);
      showToast('Milestone deleted.');
      App.closeModal();
      this.loadGanttData();
    } catch (e) {}
  }
};
