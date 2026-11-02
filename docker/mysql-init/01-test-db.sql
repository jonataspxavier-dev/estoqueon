-- Banco separado para os testes automatizados
CREATE DATABASE IF NOT EXISTS estoqueon_test;
GRANT ALL PRIVILEGES ON estoqueon_test.* TO 'estoqueon'@'%';
-- Necessário para o Prisma criar o shadow database em `prisma migrate dev`
GRANT CREATE, DROP, ALTER, INDEX, REFERENCES ON *.* TO 'estoqueon'@'%';
FLUSH PRIVILEGES;
