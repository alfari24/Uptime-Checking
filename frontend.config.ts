import { MaintenanceConfig, PageConfig } from './types/config'

/**
 * NOTE: These are fallback/default values only.
 * The actual configuration is now loaded from status-config.yaml and served via the API.
 * These values will only be used if the API request fails for some reason.
 */

const pageConfig: PageConfig = {
  // Title for your status page (fallback)
  title: "Status Monitor",
  // Links shown at the header of your status page (fallback)
  links: [],
  // Group your monitors (fallback)
  group: {},
}

// Fallback maintenances
const maintenances: MaintenanceConfig[] = []

/**
 * IMPORTANT: All configuration has been moved to server/status-config.yaml
 * Edit that file to change your configuration.
 * 
 * - title: The title of your status page
 * - links: Links to show in the header
 * - group: How to group your monitors
 * - maintenances: Schedule maintenance information
 */

// Don't forget this, otherwise compilation fails.
export { pageConfig, maintenances }