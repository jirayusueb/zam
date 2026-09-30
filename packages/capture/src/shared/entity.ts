/** Identity-bearing domain object: two entities are the same iff their ids match. */
export interface Entity<Id> {
  readonly id: Id;
}
