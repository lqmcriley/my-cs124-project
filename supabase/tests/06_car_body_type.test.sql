-- Car body style.
-- Run with: npm run test:db

insert into auth.users (id, email) values ('66666666-0000-0000-0000-000000000001', 'alma6@illinois.edu');
insert into public.profiles (id, full_name) values ('66666666-0000-0000-0000-000000000001', 'Alma Mater');
insert into public.cars (owner_id, make, model, color, plate, mpg, seats)
values ('66666666-0000-0000-0000-000000000001', 'Toyota', 'RAV4', 'Blue', 'XYZ', 30, 4);

select test.ok((select body_type = 'sedan' from public.cars where owner_id = '66666666-0000-0000-0000-000000000001'), 'existing cars start as a sedan');
set role authenticated;
select test.as('66666666-0000-0000-0000-000000000001');
update public.cars set body_type = 'suv' where owner_id = '66666666-0000-0000-0000-000000000001';
select test.ok((select body_type = 'suv' from public.cars where owner_id = '66666666-0000-0000-0000-000000000001'), 'you can pick your car''s body style');
select test.fails($$update public.cars set body_type = 'spaceship'$$, 'only known body styles are allowed');
reset role;
