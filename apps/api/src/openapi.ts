import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

export function configureOpenApi(app: INestApplication): OpenAPIObject {
  const openApiConfig = new DocumentBuilder()
    .setTitle('Comandinha API')
    .setDescription('API do Comandinha para gerenciamento de pedidos e restaurantes.')
    .setVersion('1.0.0')
    .build();
  const openApiDocument = SwaggerModule.createDocument(app, openApiConfig);

  SwaggerModule.setup('docs', app, openApiDocument, {
    jsonDocumentUrl: '/openapi.json',
  });

  return openApiDocument;
}
