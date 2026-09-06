-- EUobserver Think Tank — Supabase backend
-- Run this entire file once in Supabase > SQL Editor.

create table if not exists public.questions (
  day date primary key,
  question text not null,
  option_a text not null default 'Yes',
  option_b text not null default 'No',
  status text not null default 'DRAFT' check (status in ('DRAFT','PUBLISHED')),
  source_url text,
  editor_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participants (
  identity text primary key,
  created_at timestamptz not null default now()
);

create table if not exists public.responses (
  day date not null references public.questions(day) on delete cascade,
  identity text not null references public.participants(identity) on delete cascade,
  prediction_a_pct smallint not null check (prediction_a_pct between 0 and 100),
  vote text not null check (vote in ('A','B')),
  submitted_at timestamptz not null default now(),
  primary key (day, identity)
);

create index if not exists responses_day_idx on public.responses(day);

alter table public.questions enable row level security;
alter table public.participants enable row level security;
alter table public.responses enable row level security;

revoke all on public.questions from anon, authenticated;
revoke all on public.participants from anon, authenticated;
revoke all on public.responses from anon, authenticated;

create or replace function public.tt_clean_identity(v text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(upper(trim(coalesce(v,''))), '[^A-Z0-9 ]', ' ', 'g')
$$;

create or replace function public.tt_new_identity()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  adjectives text[] := array[
    'SLEEPY','RESTLESS','SHARP','SCEPTICAL','FEDERALIST','FRUGAL','QUIET','LOUD','POLITE','BLUNT',
    'CURIOUS','CAUTIOUS','WITTY','DRY','CYNICAL','OPTIMISTIC','PRAGMATIC','TACTICAL','SECRET','JUNIOR',
    'RELUCTANT','DIPLOMATIC','AMBITIOUS','CAFFEINATED','MIDNIGHT','POLISHED','OBSCURE','RADICAL','PROCEDURAL',
    'RAINY','WEARY','PATIENT','IMPATIENT','SERIOUS','PLAYFUL','TACTICAL','STRATEGIC','LOST','CONNECTED'
  ];
  characters text[] := array[
    'ATTACHE','RAPPORTEUR','LOBBYIST','COMMISSIONER','SHERPA','DIPLOMAT','AMBASSADOR','MEP','CORRESPONDENT',
    'SPOKESPERSON','OFFICIAL','NEGOTIATOR','REGULATOR','WONK','BUREAUCRAT','TECHNOCRAT','ADVISER','MINISTER',
    'DELEGATE','ANALYST','JOURNALIST','INTERN','STAFFER','ECONOMIST','TRANSLATOR','FIXER','ENVOY','INSIDER'
  ];
  candidate text;
  i int;
begin
  for i in 1..100 loop
    candidate := adjectives[1 + floor(random() * array_length(adjectives,1))::int] || ' ' ||
                 characters[1 + floor(random() * array_length(characters,1))::int];
    begin
      insert into public.participants(identity) values (candidate);
      return jsonb_build_object('ok',true,'code',candidate);
    exception when unique_violation then
      null;
    end;
  end loop;
  return jsonb_build_object('ok',false,'error','Could not allocate a Brussels identity.');
end;
$$;

create or replace function public.tt_validate_identity(p_identity text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'ok', true,
    'valid', exists(select 1 from public.participants where identity = tt_clean_identity(p_identity))
  )
$$;

create or replace function public.tt_question(p_day date default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := coalesce(p_day, (now() at time zone 'Europe/Brussels')::date);
  today date := (now() at time zone 'Europe/Brussels')::date;
  q public.questions%rowtype;
begin
  if d > today then return jsonb_build_object('ok',true,'state','future','day',d); end if;
  select * into q from public.questions where day=d and status='PUBLISHED';
  if not found then return jsonb_build_object('ok',true,'state','missing','day',d); end if;
  return jsonb_build_object('ok',true,'state',case when d=today then 'open' else 'closed' end,'day',d,
    'question',q.question,'option_a',q.option_a,'option_b',q.option_b);
end;
$$;

create or replace function public.tt_status(p_day date, p_identity text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare r public.responses%rowtype; ident text := tt_clean_identity(p_identity);
begin
  select * into r from public.responses where day=p_day and identity=ident;
  if not found then return jsonb_build_object('ok',true,'answered',false); end if;
  return jsonb_build_object('ok',true,'answered',true,'prediction',r.prediction_a_pct,'vote',r.vote);
end;
$$;

create or replace function public.tt_submit_answer(p_day date, p_identity text, p_prediction integer, p_vote text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ident text := tt_clean_identity(p_identity);
  today date := (now() at time zone 'Europe/Brussels')::date;
  existing public.responses%rowtype;
begin
  if p_day <> today then return jsonb_build_object('ok',false,'error','Answers are only accepted for today.'); end if;
  if p_prediction < 0 or p_prediction > 100 or upper(p_vote) not in ('A','B') then return jsonb_build_object('ok',false,'error','Invalid answer.'); end if;
  if not exists(select 1 from public.questions where day=p_day and status='PUBLISHED') then return jsonb_build_object('ok',false,'error','Question is not open.'); end if;
  if not exists(select 1 from public.participants where identity=ident) then return jsonb_build_object('ok',false,'error','Unknown Brussels identity.'); end if;

  select * into existing from public.responses where day=p_day and identity=ident;
  if found then return jsonb_build_object('ok',true,'answered',true,'duplicate',true,'prediction',existing.prediction_a_pct,'vote',existing.vote); end if;

  insert into public.responses(day,identity,prediction_a_pct,vote) values(p_day,ident,p_prediction,upper(p_vote));
  return jsonb_build_object('ok',true,'answered',true,'prediction',p_prediction,'vote',upper(p_vote));
end;
$$;

create or replace function public.tt_summary(p_day date, p_identity text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Europe/Brussels')::date;
  q public.questions%rowtype;
  n integer;
  a_pct numeric;
  mean_pred numeric;
  ident text := tt_clean_identity(p_identity);
  own public.responses%rowtype;
  own_error numeric;
  beat numeric;
begin
  if p_day >= today then return jsonb_build_object('ok',true,'state',case when p_day>today then 'future' else 'open' end,'day',p_day); end if;
  select * into q from public.questions where day=p_day and status='PUBLISHED';
  if not found then return jsonb_build_object('ok',true,'state','missing','day',p_day); end if;

  select count(*), coalesce(100.0*avg(case when vote='A' then 1 else 0 end),0), avg(prediction_a_pct)
    into n,a_pct,mean_pred from public.responses where day=p_day;

  if n=0 then
    return jsonb_build_object('ok',true,'state','closed','day',p_day,'question',q.question,'option_a',q.option_a,'option_b',q.option_b,
      'responses',0,'option_a_pct',0,'mean_prediction_a',null,'user',null);
  end if;

  select * into own from public.responses where day=p_day and identity=ident;
  if found then
    own_error := abs(own.prediction_a_pct-a_pct);
    if n >= 10 then
      select 100.0*count(*)/n into beat from public.responses where day=p_day and abs(prediction_a_pct-a_pct) > own_error;
    end if;
  end if;

  return jsonb_build_object('ok',true,'state','closed','day',p_day,'question',q.question,'option_a',q.option_a,'option_b',q.option_b,
    'responses',n,'option_a_pct',a_pct,'mean_prediction_a',mean_pred,
    'user',case when own.identity is null then null else jsonb_build_object('prediction',own.prediction_a_pct,'vote',own.vote,'error',own_error,'beat_pct',beat) end);
end;
$$;

grant execute on function public.tt_new_identity() to anon, authenticated;
grant execute on function public.tt_validate_identity(text) to anon, authenticated;
grant execute on function public.tt_question(date) to anon, authenticated;
grant execute on function public.tt_status(date,text) to anon, authenticated;
grant execute on function public.tt_submit_answer(date,text,integer,text) to anon, authenticated;
grant execute on function public.tt_summary(date,text) to anon, authenticated;

-- Functions are executable by PUBLIC by default. Remove that implicit access so
-- only the explicit anon/authenticated RPC grants above remain.
revoke execute on function public.tt_clean_identity(text) from public, anon, authenticated;
revoke execute on function public.tt_new_identity() from public;
revoke execute on function public.tt_validate_identity(text) from public;
revoke execute on function public.tt_question(date) from public;
revoke execute on function public.tt_status(date,text) from public;
revoke execute on function public.tt_submit_answer(date,text,integer,text) from public;
revoke execute on function public.tt_summary(date,text) from public;

-- Optional first test question: change the date/question before running if desired.
-- insert into public.questions(day,question,option_a,option_b,status)
-- values (current_date,'Will the EU have more than 30 member states by 2035?','Yes','No','PUBLISHED')
-- on conflict (day) do update set question=excluded.question, option_a=excluded.option_a, option_b=excluded.option_b, status=excluded.status;
