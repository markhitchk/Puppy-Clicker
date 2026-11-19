-- Crash Test Pup V1/V2 are free public testing assets, not rare rewards.
-- Keep their IDs and acquisition source unchanged. Other rarity weights stay fixed.
do $$
declare
  n integer;
  changed integer;
begin
  select count(*) into n from puppy_rarity.catalog
   where puppy_id in ('test_v1_crash_dummy','test_v2_crash_dummy')
    and published and acquisition='standard';
  if n <> 2 then raise exception 'FREE_TEST_PUPPY_CATALOG_MISMATCH'; end if;

  update puppy_rarity.catalog
   set rarity='common',version=version+1
   where puppy_id in ('test_v1_crash_dummy','test_v2_crash_dummy')
    and rarity is distinct from 'common';
  get diagnostics changed = row_count;
  if changed > 0 then
    update puppy_rarity.config set version=version+1 where singleton=true;
  end if;
end $$;
