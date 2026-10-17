-- PROMOTION LEVEL 2 • UKM R'nB UNDIP 2026
-- Run once in a new Supabase project's SQL editor. No service_role key is used in browser.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Penguji',
  role text not null default 'examiner' check (role in ('admin','examiner')),
  created_at timestamptz not null default now()
);
create table if not exists public.groups (
  id text primary key,
  type text not null check (type in ('GDO','GDB','GDD')),
  position text not null,
  unit text not null,
  description text not null default ''
);
create table if not exists public.study_cases (
  group_id text primary key references public.groups(id) on delete cascade,
  question_a text not null,
  key_a text not null,
  question_b text not null,
  key_b text not null,
  followup text not null default '',
  competency text not null default '',
  source text not null default ''
);
create table if not exists public.examiner_groups (
  examiner_id uuid not null references public.profiles(id) on delete cascade,
  group_id text not null references public.groups(id) on delete cascade,
  primary key (examiner_id, group_id)
);
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  group_id text not null references public.groups(id),
  full_name text not null,
  submission_status text not null default 'unverified' check(submission_status in ('unverified','on_time','late','missing')),
  presentation_status text not null default 'unverified' check(presentation_status in ('unverified','present','absent')),
  submission_at timestamptz,
  evidence_url text not null default '',
  exception_status text not null default 'normal' check(exception_status in ('normal','review','excused','confirmed_d')),
  exception_reason text not null default '',
  updated_at timestamptz not null default now()
);
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  evaluator_id uuid not null references public.profiles(id),
  document_scores jsonb not null default '{}'::jsonb,
  presentation_scores jsonb not null default '{}'::jsonb,
  evidence text not null default '',
  feedback_strengths text not null default '',
  feedback_improvements text not null default '',
  feedback_actions text not null default '',
  status text not null default 'draft' check(status in ('draft','submitted')),
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(participant_id,evaluator_id)
);
create table if not exists public.moderations (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  decision text not null check(decision in ('approve_average','approve_single','override')),
  override_score numeric(5,2) check(override_score between 0 and 100),
  reason text not null check(length(trim(reason))>=12),
  decided_by uuid not null references public.profiles(id),
  decided_at timestamptz not null default now(),
  constraint override_required check ((decision='override' and override_score is not null) or (decision<>'override' and override_score is null))
);
create table if not exists public.individual_feedback (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  strengths text not null default '',
  improvements text not null default '',
  next_steps text not null default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table if not exists public.group_feedback (
  group_id text primary key references public.groups(id),
  strengths text not null default '',
  improvements text not null default '',
  next_steps text not null default '',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  table_name text not null,
  operation text not null,
  target_id text,
  old_data jsonb,
  new_data jsonb,
  occurred_at timestamptz not null default now()
);
create table if not exists public.app_settings (
  id integer primary key default 1 check(id=1),
  scoring_mode text not null default 'dual' check(scoring_mode in ('dual','single_moderator')),
  calibration_threshold numeric not null default 10 check(calibration_threshold between 0 and 100),
  rubric_version text not null default 'PL2-2026-V2',
  updated_at timestamptz not null default now()
);
insert into public.app_settings (id) values(1) on conflict do nothing;

-- Profiles created for invited Supabase Auth users. Promote first admin manually (see README).
create or replace function public.on_new_auth_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1))) on conflict do nothing;
 return new;
end $$;
drop trigger if exists auth_user_created_pl2 on auth.users;
create trigger auth_user_created_pl2 after insert on auth.users for each row execute function public.on_new_auth_user();
-- Backfill users created prior to installing schema.
insert into public.profiles(id, display_name)
select id,coalesce(nullif(raw_user_meta_data->>'full_name',''),split_part(email,'@',1)) from auth.users on conflict(id) do nothing;

create or replace function public.valid_pl2_ratings(ratings jsonb, kind text) returns boolean language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; n numeric;
begin
 if jsonb_typeof(ratings)<>'object' or kind not in ('D','P') then return false; end if;
 for k,v in select key,value from jsonb_each(ratings) loop
   if (kind='D' and k not in ('D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11')) or
      (kind='P' and k not in ('P01','P02','P03','P04','P05')) then return false; end if;
   if jsonb_typeof(v)<>'number' then return false; end if;
   n=(v::text)::numeric;
   if n<0 or n>4 or n<>trunc(n) then return false; end if;
 end loop;
 return true;
end $$;
alter table public.scores add constraint pl2_doc_ratings_valid check(public.valid_pl2_ratings(document_scores,'D'));
alter table public.scores add constraint pl2_pres_ratings_valid check(public.valid_pl2_ratings(presentation_scores,'P'));

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
create or replace function public.can_review(p_group_id text) returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_admin() or exists(select 1 from public.examiner_groups where examiner_id=(select auth.uid()) and group_id=p_group_id);
$$;
revoke all on function public.is_admin() from public;
revoke all on function public.can_review(text) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_review(text) to authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.examiner_groups enable row level security;
alter table public.study_cases enable row level security;
alter table public.participants enable row level security;
alter table public.scores enable row level security;
alter table public.moderations enable row level security;
alter table public.group_feedback enable row level security;
alter table public.individual_feedback enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

revoke all on public.profiles,public.groups,public.study_cases,public.examiner_groups,public.participants,public.scores,public.moderations,public.group_feedback,public.individual_feedback,public.audit_logs,public.app_settings from anon,authenticated;
grant select on public.profiles,public.groups,public.study_cases,public.examiner_groups,public.participants,public.scores,public.moderations,public.group_feedback,public.individual_feedback,public.audit_logs,public.app_settings to authenticated;
grant insert,update on public.scores to authenticated;
grant insert,update,delete on public.examiner_groups to authenticated;
grant insert,update on public.participants,public.groups,public.moderations,public.group_feedback,public.individual_feedback,public.study_cases to authenticated;
grant update on public.app_settings to authenticated;

create policy "profile_self_or_admin" on public.profiles for select to authenticated using (id=(select auth.uid()) or public.is_admin());
create policy "groups_read_assigned" on public.groups for select to authenticated using (public.can_review(id));
create policy "groups_admin_insert" on public.groups for insert to authenticated with check(public.is_admin());
create policy "groups_admin_update" on public.groups for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "cases_read_assigned" on public.study_cases for select to authenticated using(public.can_review(group_id));
create policy "cases_admin_insert" on public.study_cases for insert to authenticated with check(public.is_admin());
create policy "cases_admin_update" on public.study_cases for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "assignment_read" on public.examiner_groups for select to authenticated using(examiner_id=(select auth.uid()) or public.is_admin());
create policy "assignment_admin_insert" on public.examiner_groups for insert to authenticated with check(public.is_admin());
create policy "assignment_admin_update" on public.examiner_groups for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "assignment_admin_delete" on public.examiner_groups for delete to authenticated using(public.is_admin());
create policy "participants_read" on public.participants for select to authenticated using(public.can_review(group_id));
create policy "participants_admin_insert" on public.participants for insert to authenticated with check(public.is_admin());
create policy "participants_admin_update" on public.participants for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "scores_read_private" on public.scores for select to authenticated using(evaluator_id=(select auth.uid()) or public.is_admin());
create policy "scores_insert_own" on public.scores for insert to authenticated with check(evaluator_id=(select auth.uid()) and exists(select 1 from public.participants p where p.id=participant_id and public.can_review(p.group_id)));
create policy "scores_update_own" on public.scores for update to authenticated using(evaluator_id=(select auth.uid()) and exists(select 1 from public.participants p where p.id=participant_id and public.can_review(p.group_id))) with check(evaluator_id=(select auth.uid()) and exists(select 1 from public.participants p where p.id=participant_id and public.can_review(p.group_id)));
create policy "moderation_admin_read" on public.moderations for select to authenticated using(public.is_admin());
create policy "moderation_admin_insert" on public.moderations for insert to authenticated with check(public.is_admin() and decided_by=(select auth.uid()));
create policy "moderation_admin_update" on public.moderations for update to authenticated using(public.is_admin()) with check(public.is_admin() and decided_by=(select auth.uid()));
create policy "feedback_admin_read" on public.group_feedback for select to authenticated using(public.is_admin());
create policy "feedback_admin_insert" on public.group_feedback for insert to authenticated with check(public.is_admin() and updated_by=(select auth.uid()));
create policy "feedback_admin_update" on public.group_feedback for update to authenticated using(public.is_admin()) with check(public.is_admin() and updated_by=(select auth.uid()));
create policy "individual_feedback_admin_read" on public.individual_feedback for select to authenticated using(public.is_admin());
create policy "individual_feedback_admin_insert" on public.individual_feedback for insert to authenticated with check(public.is_admin() and updated_by=(select auth.uid()));
create policy "individual_feedback_admin_update" on public.individual_feedback for update to authenticated using(public.is_admin()) with check(public.is_admin() and updated_by=(select auth.uid()));
create policy "audit_admin_read" on public.audit_logs for select to authenticated using(public.is_admin());
create policy "settings_auth_read" on public.app_settings for select to authenticated using(true);
create policy "settings_admin_update" on public.app_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());

-- Row audit is written server-side; browser roles have NO insert permission on audit_logs.
create or replace function public.audit_pl2_changes() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 insert into public.audit_logs(actor_id,table_name,operation,target_id,old_data,new_data)
 values ((select auth.uid()),TG_TABLE_NAME,TG_OP,
 coalesce((case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end)->>'id',
          (case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end)->>'participant_id',
          (case when TG_OP='DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end)->>'group_id'),
 case when TG_OP='INSERT' then null else to_jsonb(OLD) end,
 case when TG_OP='DELETE' then null else to_jsonb(NEW) end);
 return case when TG_OP='DELETE' then OLD else NEW end;
end $$;
create or replace function public.touch_pl2_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=now(); return new; end $$;
do $$
declare t text;
begin
 foreach t in array array['scores','participants','group_feedback','individual_feedback','app_settings'] loop
   execute format('drop trigger if exists touch_%I on public.%I',t,t);
   execute format('create trigger touch_%I before update on public.%I for each row execute function public.touch_pl2_updated_at()',t,t);
 end loop;
 foreach t in array array['scores','participants','moderations','group_feedback','individual_feedback','examiner_groups','app_settings'] loop
   execute format('drop trigger if exists audit_%I on public.%I',t,t);
   execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_pl2_changes()',t,t);
 end loop;
end $$;

-- If an examiner revises scored content, prior panel resolution is invalidated and audited.
create or replace function public.invalidate_mod_after_rescore() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.document_scores is distinct from new.document_scores)
     or (old.presentation_scores is distinct from new.presentation_scores)
     or (old.status is distinct from new.status) then
     delete from public.moderations where participant_id=new.participant_id;
  end if;
  return new;
end $$;
drop trigger if exists invalidate_mod_after_rescore on public.scores;
create trigger invalidate_mod_after_rescore after update on public.scores
for each row execute function public.invalidate_mod_after_rescore();

-- Enable row-filtered realtime. Publication is normally present in Supabase projects.
do $$
declare t text;
begin
 foreach t in array array['scores','participants','moderations','group_feedback','individual_feedback','app_settings'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
     execute format('alter publication supabase_realtime add table public.%I',t);
   end if;
 end loop;
end $$;
create index if not exists ix_participants_group on public.participants(group_id);
create index if not exists ix_scores_participant on public.scores(participant_id);
create index if not exists ix_audit_time on public.audit_logs(occurred_at desc);
