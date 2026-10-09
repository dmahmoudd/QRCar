FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY src/QrCar.Domain/QrCar.Domain.csproj src/QrCar.Domain/
COPY src/QrCar.Application/QrCar.Application.csproj src/QrCar.Application/
COPY src/QrCar.Infrastructure/QrCar.Infrastructure.csproj src/QrCar.Infrastructure/
COPY src/QrCar.Api/QrCar.Api.csproj src/QrCar.Api/
RUN dotnet restore src/QrCar.Api/QrCar.Api.csproj

COPY src/ src/
RUN dotnet publish src/QrCar.Api/QrCar.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080
USER $APP_UID

ENTRYPOINT ["dotnet", "QrCar.Api.dll"]
