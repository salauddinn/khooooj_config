Select Visit,Gender,Diagnosis,Count(1) as VisitCount  from(
Select v.patient_id,vt.name as Visit,p.Gender,o.value_text as Diagnosis from visit v
Inner join visit_type vt
on vt.visit_type_id=v.visit_type_id
Inner join person p
on p.person_id=v.patient_id
right join obs o
on o.person_id=p.person_id
Where o.concept_id=14
and cast(o.obs_datetime as date) BETWEEN '#startDate#' and '#endDate#'
union all
Select v.patient_id,vt.name as visit,p.Gender,pdv.name as Diagnosis from visit v
Inner join visit_type vt
on vt.visit_type_id=v.visit_type_id
Inner join person p
on p.person_id=v.patient_id
Right join patient_diagnosis_view pdv
on pdv.person_id=p.person_id
Where cast(pdv.obs_datetime as date) BETWEEN '#startDate#' and '#endDate#') as a
Group by Visit,Gender,Diagnosis
Order by Visit,Gender;