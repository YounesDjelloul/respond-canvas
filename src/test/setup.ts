import { cleanup } from '@testing-library/vue'
import { afterEach } from 'vitest'

Element.prototype.scrollIntoView = () => undefined

afterEach(() => {
  cleanup()
})
