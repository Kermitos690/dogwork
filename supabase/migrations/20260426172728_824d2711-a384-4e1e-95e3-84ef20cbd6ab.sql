TRUNCATE public._p0_test_results;

DO $$
DECLARE
  v_coach uuid := '5ae79f02-178c-44c6-a0c2-52928bfa9240';
BEGIN
  DELETE FROM courses WHERE title LIKE 'P0_TEST_%' AND educator_user_id = v_coach;
  DELETE FROM coach_charter_acceptances WHERE user_id = v_coach;
  DELETE FROM user_modules WHERE user_id = v_coach AND module_slug='payments_marketplace';
  DELETE FROM marketplace_restrictions WHERE educator_id=v_coach AND reason='P0 test';

  BEGIN
    INSERT INTO courses (educator_user_id, title, description, price_cents, max_participants, duration_minutes, is_public, approval_status, requires_dogwork_payment)
    VALUES (v_coach,'P0_TEST_A_no_charter','Cours basique',5000,5,60,true,'approved',true);
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('A_no_charter','FAIL','should have raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('A_no_charter', CASE WHEN SQLERRM LIKE '%Charte%' THEN 'PASS' ELSE 'WRONG_ERROR' END, SQLERRM);
  END;

  INSERT INTO coach_charter_acceptances(user_id,charter_version,ip_address,user_agent) VALUES(v_coach,'1.0','127.0.0.1','p0-test');

  BEGIN
    INSERT INTO courses (educator_user_id, title, description, price_cents, max_participants, duration_minutes, is_public, approval_status, requires_dogwork_payment)
    VALUES (v_coach,'P0_TEST_B_no_module','Cours basique',5000,5,60,true,'approved',true);
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('B_no_module','FAIL','should have raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('B_no_module', CASE WHEN SQLERRM LIKE '%Module%' THEN 'PASS' ELSE 'WRONG_ERROR' END, SQLERRM);
  END;

  INSERT INTO user_modules(user_id,module_slug,status,source) VALUES(v_coach,'payments_marketplace','active','p0_test');

  BEGIN
    INSERT INTO courses (educator_user_id, title, description, price_cents, max_participants, duration_minutes, is_public, approval_status, requires_dogwork_payment)
    VALUES (v_coach,'P0_TEST_C_twint','Paiement TWINT direct',5000,5,60,true,'approved',true);
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('C_external_twint','FAIL','should have raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('C_external_twint', CASE WHEN SQLERRM LIKE '%externe%' THEN 'PASS' ELSE 'WRONG_ERROR' END, SQLERRM);
  END;

  BEGIN
    INSERT INTO courses (educator_user_id, title, description, price_cents, max_participants, duration_minutes, is_public, approval_status, requires_dogwork_payment)
    VALUES (v_coach,'P0_TEST_D_zero_cap','Cours basique',5000,0,60,true,'approved',true);
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('D_zero_capacity','FAIL','should have raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('D_zero_capacity', CASE WHEN SQLERRM LIKE '%participants%' THEN 'PASS' ELSE 'WRONG_ERROR' END, SQLERRM);
  END;

  BEGIN
    INSERT INTO courses (educator_user_id, title, description, price_cents, max_participants, duration_minutes, is_public, approval_status, requires_dogwork_payment)
    VALUES (v_coach,'P0_TEST_E_no_pay','Cours basique',5000,5,60,true,'approved',false);
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('E_no_dogwork_payment','FAIL','should have raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('E_no_dogwork_payment', CASE WHEN SQLERRM LIKE '%DogWork%' THEN 'PASS' ELSE 'WRONG_ERROR' END, SQLERRM);
  END;

  BEGIN
    INSERT INTO courses (educator_user_id, title, description, price_cents, max_participants, duration_minutes, is_public, approval_status, requires_dogwork_payment)
    VALUES (v_coach,'P0_TEST_F_clean','Cours propre sur les bases du clic',5000,5,60,true,'approved',true);
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('F_clean_publish','PASS','course published');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('F_clean_publish','FAIL',SQLERRM);
  END;

  INSERT INTO marketplace_restrictions(educator_id,restriction_type,reason,status,severity,starts_at)
  VALUES(v_coach,'account_suspended','P0 test','active','high',now());
  BEGIN
    INSERT INTO courses (educator_user_id, title, description, price_cents, max_participants, duration_minutes, is_public, approval_status, requires_dogwork_payment)
    VALUES (v_coach,'P0_TEST_G_restricted','Cours basique',5000,5,60,true,'approved',true);
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('G_restricted_publish','FAIL','should have raised');
  EXCEPTION WHEN OTHERS THEN
    INSERT INTO _p0_test_results(test_name,status,message) VALUES('G_restricted_publish', CASE WHEN SQLERRM LIKE '%limit%' OR SQLERRM LIKE '%suspendu%' OR SQLERRM LIKE '%marketplace%' THEN 'PASS' ELSE 'WRONG_ERROR' END, SQLERRM);
  END;
  DELETE FROM marketplace_restrictions WHERE educator_id=v_coach AND reason='P0 test';

  DELETE FROM courses WHERE title LIKE 'P0_TEST_%' AND title <> 'P0_TEST_F_clean' AND educator_user_id = v_coach;
END $$;