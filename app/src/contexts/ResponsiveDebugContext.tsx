import React from 'react'

export type TestDimensions = {
  width: number
  height: number
}

type ResponsiveDebugContextType = {
  testDimensions: TestDimensions | null
  setTestDimensions: (dims: TestDimensions | null) => void
  isEnabled: boolean
  setEnabled: (enabled: boolean) => void
}

const ResponsiveDebugContext = React.createContext<ResponsiveDebugContextType>({
  testDimensions: null,
  setTestDimensions: () => {},
  isEnabled: false,
  setEnabled: () => {},
})

export const ResponsiveDebugProvider = ({ children }: React.PropsWithChildren) => {
  const [testDimensions, setTestDimensions] = React.useState<TestDimensions | null>(null)
  const [isEnabled, setEnabled] = React.useState(false)

  const handleSetTestDimensions = React.useCallback((dims: TestDimensions | null) => {
    setTestDimensions(dims)
    if (dims) {
      setEnabled(true)
    }
  }, [])

  const handleSetEnabled = React.useCallback((enabled: boolean) => {
    setEnabled(enabled)
    if (!enabled) {
      setTestDimensions(null)
    }
  }, [])

  return (
    <ResponsiveDebugContext.Provider
      value={{
        testDimensions,
        setTestDimensions: handleSetTestDimensions,
        isEnabled,
        setEnabled: handleSetEnabled,
      }}
    >
      {children}
    </ResponsiveDebugContext.Provider>
  )
}

export const useResponsiveDebug = () => {
  return React.useContext(ResponsiveDebugContext)
}
