import { MaintenanceConfig, PageConfig } from './types/config'

const pageConfig: PageConfig = {
  // Title for your status page
  title: "Alfari Status Page",
  // Links shown at the header of your status page, could set `highlight` to `true`
  links: [
    { link: 'https://github.com/alfari24', label: 'GitHub' },
    { link: 'https://alfari.id/', label: 'Blog' },
    { link: 'mailto:ari@alfari.id', label: 'Email Me', highlight: true },
  ],
  // [OPTIONAL] Group your monitors
  // If not specified, all monitors will be shown in a single list
  // If specified, monitors will be grouped and ordered, not-listed monitors will be invisble (but still monitored)
  group: {
    '🌐 Website': ['alfari-site'],
    '🔐 Private': ['alfari-photos'],
    '🏢 Catfein Service': ['catfein-panel', 'catfein-node-ca1'],
    '🎙️ Lavalink': ['alfari-lavalink-us', 'alfari-lavalink-sg'],
    '🖥️ Server': ['alfari-vm-ca1', 'alfari-vm-sg1'],
  },
}

// You can define multiple maintenances here
// During maintenance, an alert will be shown at status page
// Also, related downtime notifications will be skipped (if any)
// Of course, you can leave it empty if you don't need this feature
const maintenances: MaintenanceConfig[] = [
  {
    // [Optional] Monitor IDs to be affected by this maintenance
    monitors: ['foo_monitor', 'bar_monitor'],
    // [Optional] default to "Scheduled Maintenance" if not specified
    title: 'Test Maintenance',
    // Description of the maintenance, will be shown at status page
    body: 'This is a test maintenance, server software upgrade',
    // Start time of the maintenance, in UNIX timestamp or ISO 8601 format
    start: '2025-04-27T00:00:00+08:00',
    // [Optional] end time of the maintenance, in UNIX timestamp or ISO 8601 format
    // if not specified, the maintenance will be considered as on-going
    end: '2025-04-30T00:00:00+08:00',
    // [Optional] color of the maintenance alert at status page, default to "yellow"
    color: 'blue',
  },
]

// Don't forget this, otherwise compilation fails.
export { pageConfig, maintenances }