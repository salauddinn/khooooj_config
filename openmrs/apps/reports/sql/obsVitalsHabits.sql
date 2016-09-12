Select pi.identifier as 'Patient ID',
concat(concat(pn.given_name,' '),pn.family_name) as 'Patient Name',
Cast(o.obs_datetime as date) as 'Observation Date',
vt.name as 'Visit Type',
cn.Name as 'Vitals and Habits',
coalesce(o.value_boolean,value_numeric,value_text,(Select name from concept_name where concept_name_type='FULLY_SPECIFIED' and concept_id=o.value_coded)) as 'Value Recorded'
from obs o
Inner join concept_name cn
on cn.concept_id=o.concept_id
Inner join concept_set cs
on cs.concept_id=o.concept_id
Inner join person_name pn
on pn.person_id=o.person_id
Inner join patient_identifier pi
on pi.patient_id=o.person_id
inner join encounter e
on e.encounter_id=o.encounter_id
inner join visit v
on v.visit_id=e.visit_id
inner join visit_type vt
on v.visit_type_id=vt.visit_type_id
where cast(o.obs_datetime as date) BETWEEN '#startDate#' and '#endDate#'
and o.obs_group_id is not null
and cn.concept_name_type in('FULLY_SPECIFIED')
and cn.concept_id in (Select cset.concept_id from concept_set cset, concept_name cname where cset.concept_set=cname.concept_id
and cname.name='Nutritional Values')
Order by Cast(o.obs_datetime as date),pi.identifier,vt.name,cn.name;