-- Optional admin views for the Supabase dashboard.
-- Run after schema.sql.

create or replace view public.think_tank_questions_admin as
select
  day,
  question,
  option_a,
  option_b,
  status,
  source_url,
  editor_note,
  'https://hackejandro.github.io/eu-media-poll/?day=' || day::text as quiz_url,
  created_at,
  updated_at
from public.questions
order by day desc;

create or replace view public.think_tank_results_admin as
select
  q.day,
  q.question,
  count(r.identity)::int as responses,
  round(100.0 * avg(case when r.vote='A' then 1 else 0 end),1) as option_a_pct,
  round(avg(r.prediction_a_pct),1) as mean_prediction_a,
  round(percentile_cont(0.5) within group (order by r.prediction_a_pct)::numeric,1) as median_prediction_a,
  'https://hackejandro.github.io/eu-media-poll/?day=' || q.day::text as quiz_url
from public.questions q
left join public.responses r on r.day=q.day
where q.status='PUBLISHED'
group by q.day,q.question
order by q.day desc;

revoke all on public.think_tank_questions_admin from anon, authenticated;
revoke all on public.think_tank_results_admin from anon, authenticated;
