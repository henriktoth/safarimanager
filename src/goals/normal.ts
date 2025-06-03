import Goal from '@/goals/goal'
import { goal } from '@/utils/registry'

@goal('safari:difficulty/normal')
export default class Normal extends Goal {
  public toString(): string {
    return 'safari:difficulty/normal'
  }
}
