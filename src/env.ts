declare var window: any

function getTLD() {
  if (window) {
    return window.location.hostname.match(/(\w+)$/)[0]
  }
}

function isValidTLD(TLD: string) {
  return TLD === 'org' || TLD === 'today' || TLD === 'zone'
}

export function getAuthURL() {
  const TLD = getTLD()
  return `https://auth.decentraland.${isValidTLD(TLD) ? TLD : 'zone'}/api/v1`
}
