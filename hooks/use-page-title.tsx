import * as React from "react"

const SITE_NAME = "Josh Eckels"

export function usePageTitle(title: string, includeSiteName: boolean = true) {
  React.useEffect(() => {
    // Set the document title when the component mounts or when the title changes
    document.title = includeSiteName ? `${title} | ${SITE_NAME}` : title
    
    // Restore the original title when the component unmounts
    return () => {
      // This is optional and can be removed if not needed
      // document.title = SITE_NAME
    }
  }, [title, includeSiteName])
}