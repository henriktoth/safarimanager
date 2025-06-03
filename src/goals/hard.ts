import Goal from '@/goals/goal'
import { goal } from '@/utils/registry'

@goal('safari:difficulty/hard')
export default class Hard extends Goal {
  public toString(): string {
    return 'safari:difficulty/hard'
  }
}
